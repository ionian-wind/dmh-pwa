---
title: 'Dice probability syntax'
description: 'Supported AnyDice syntax for the dice probability calculator.'
order: 10
---

# Dice probability syntax

Supported syntax for the dice probability calculator.

## Program basics

A program is a sequence of statements. Variables are uppercase words and are
assigned with a colon. Use `output` to add a result and `named` to give it a
title.

```text
X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"
```

- Comments use backslashes: `\ this is ignored \`
- Variables can be reassigned and are evaluated in order.
- `0` is false; any non-zero number is true.
- Named outputs support `[VARIABLE]` interpolation, for example
  `named "ability [P]"`.

## Numbers, dice and operators

| Syntax           | Meaning                                                                             | Example                     |
| ---------------- | ----------------------------------------------------------------------------------- | --------------------------- |
| `+ - * /`        | Arithmetic. Integer division rounds toward zero.                                    | `output 2d6 + 3`            |
| `^`              | Exponentiation with a non-negative integer exponent.                                | `output 2 ^ 3`              |
| `= != < > <= >=` | Comparison. Produces a 0/1 die when applied to dice.                                | `output 3d6 >= 15`          |
| `&` &#124; `!`   | Boolean and, or and not. Zero is false; any other number is true.                   | `output 1d6 > 3 & 1d6 != 6` |
| `@`              | Position access on a sequence, dice collection or number digits.                    | `output 1@3d6`              |
| `#`              | Length of a sequence or dice collection; number of digits for a number.             | `output #(3d6)`             |
| `d`              | Creates a die or a collection of dice.                                              | `output 4d6`                |
| `..`             | Inclusive range inside a sequence literal.                                          | `{1..6}`                    |
| `:`              | Sequence repetition count, and the separator between a variable name and its value. | `{1:4}`, `X: 3`             |

`d6` is one six-sided die, `3d6` is a collection of three dice that are summed,
and `d%` is a d100. Custom dice use a sequence such as `d{1,2,4,4}`. Any
expression can provide the faces, for example `2d(1d4)`. The empty die is
written `d{}`.

## Sequences

Sequences are written with braces. They preserve their written order; use
`sort` when you want the position-order setting applied. Mathematical and
boolean operations sum all elements of a sequence.

```text
{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}
```

### Position and length

```text
1 @ {2,4,6}    \ 2 \
3 @ {2,4,6}    \ 6 \
{1,3} @ {2,4,6} \ 8 \
# {2,4,6}      \ 3 \
1 @ 246        \ 2 \
# 1234         \ 4 \
# (3d6)        \ 3 \
{1,2} @ 3d6
```

`set "position order" to "lowest first"` reverses dice positions and digit
positions. It does not reorder sequence literals until `sort` is used.

## Loops and conditionals

```text
loop N over {1..4} {
  output Nd4 named "[N]d4"
}

X: 1
if X = 1 {
  output 1
}
else if X = 2 {
  output 2
}
else {
  output 1d6
}
```

Conditions can use comparisons and boolean operators. `else if` is supported.
A die cannot be used directly as an `if` condition; pass it to a function with
a typed parameter when you need to expand it. Loops iterate over series or dice
values.

## Functions

Function names are made of lowercase words and uppercase parameter variables.
Invoke a function by putting its name and arguments in square brackets. A
function returns as soon as `result:` is reached; without a `result` it returns
the empty die.

```text
function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]
```

Parameter types control how values are converted. A parameter without a type
receives the value unchanged:

- `:n` — numbers. A sequence is summed; a die is expanded once per outcome.
- `:d` — dice. A number becomes a constant die; a sequence is summed and
  becomes a constant die.
- `:s` — sequences. A number becomes a one-element sequence; dice are expanded
  into all possible sorted rolls.

Functions can recurse. The maximum depth is controlled with
`set "maximum function depth" to N`. `output` and `set` are not allowed inside
a function.

## Function library

| Function                     | Meaning                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `[absolute NUMBER]`          | Absolute value.                                                  |
| `[SEQUENCE contains NUMBER]` | 1 if the number occurs in the sequence, otherwise 0.             |
| `[count VALUES in SEQUENCE]` | Counts occurrences; repeated values are counted repeatedly.      |
| `[explode DIE]`              | Keeps rolling when the maximum value is rolled.                  |
| `[highest N of DICE]`        | Sum of the highest N values. Supports multiple pools with `and`. |
| `[lowest N of DICE]`         | Sum of the lowest N values. Supports multiple pools with `and`.  |
| `[middle N of DICE]`         | Sum of the middle N values.                                      |
| `[highest of A and B]`       | Higher of two numbers; dice are expanded per outcome.            |
| `[lowest of A and B]`        | Lower of two numbers; dice are expanded per outcome.             |
| `[maximum of DIE]`           | Highest possible value on a die (0 for an empty die).            |
| `[minimum of DIE]`           | Lowest possible value on a die (engine extension).               |
| `[reverse SEQUENCE]`         | Reverses the sequence order.                                     |
| `[sort SEQUENCE]`            | Sorts using the position order setting.                          |

## Settings

```text
set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5
```

Settings apply to the statements that follow them. The default position order
is highest first.

## Examples

### 4d6 drop lowest

```text
output [highest 3 of 4d6] named "4d6 drop lowest"

ABILITIES: 6 d [highest 3 of 4d6]
loop P over {1..6} {
  output P @ ABILITIES named "Ability [P]"
}
```

### Blades in the Dark

```text
function: blades ROLL:s {
  if 1@ROLL = 6 {
    result: 2 + (2@ROLL = 6)
  }
  result: 1@ROLL >= 4
}

output [blades 2d6] named "0d"
loop P over {1..7} {
  output [blades Pd6] named "[P]d"
}
```

### Exploding dice

```text
set "explode depth" to 3
output [explode d6] named "one exploding d6"
output 2d[explode d6] named "two independent exploding dice"
```

### Functions and type casting

```text
function: double N:n if above B:n {
  if N > B { result: N + N }
  result: N
}

output [double d6 if above 3] named "1, 2, 3, 8, 10, 12"

function: ROLL:s count fives and above and subtract ones {
  result: (ROLL >= 5) - (ROLL = 1)
}

output [3d6 count fives and above and subtract ones]
```
