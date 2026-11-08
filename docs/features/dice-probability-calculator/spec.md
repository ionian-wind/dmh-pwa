# Dice Probability Calculator: Complete Specification

A comprehensive, language-agnostic blueprint for building a dice probability calculator with the same functionality and power as AnyDice. This document is based on and aligns with the official AnyDice documentation.

## Implementation status

The maintained implementation lives in
`src/utils/dice-probability-calculator/`. Parts 1–4 (distribution mechanics,
language, types and built-in functions) and the parser/evaluator are
implemented. The application UI and output views live separately in
`src/probability-calculator/`; exact memoization/FFT optimisation from Part 6 is
not implemented yet. See [README.md](README.md) for the validation matrix and
[library.md](library.md) for the current API and limitations.

## Table of Contents

1. [Part 1: Core Probability Computation Mechanics](#part-1-core-probability-computation-mechanics)
2. [Part 2: The Scripting Language and Its Environment](#part-2-the-scripting-language-and-its-environment)
3. [Part 3: Data Types and Their Internal Representation](#part-3-data-types-and-their-internal-representation)
4. [Part 4: Built-in Functions and Operations](#part-4-built-in-functions-and-operations)
5. [Part 5: System Architecture](#part-5-system-architecture)
6. [Part 6: Implementation Considerations and Advanced Topics](#part-6-implementation-considerations-and-advanced-topics)

---

## Part 1: Core Probability Computation Mechanics

The fundamental challenge of a dice probability calculator is moving from _simulation_ (rolling a million times) to _exact analytical computation_. AnyDice achieves this by treating every outcome as a **Discrete Probability Distribution**.

### 1.1. Foundational Data Structure: The Distribution (Die)

At the lowest level, a "Die" is not a random number generator; it is a mapping of outcome values to probabilities.

**Internal Representation:**
A **Probability Mass Function (PMF)**. The most robust implementation uses one of two models:

- **Model A: Dense Array (for small ranges).** An array where the index is the outcome value and the value is the probability (or weight).
- **Model B: Sparse Map (for large ranges/exploding dice).** A Hash Map/Dictionary where Key = Outcome (Integer) and Value = Weight (Integer/Float).

**Recommendation:** Use **Integer Weights** (e.g., count of combinations) rather than floating-point percentages during computation. This avoids precision loss. Convert to percentages only at the final output stage.

- _Example:_ <code>1d6</code> = <code>{1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1}</code> (Total Weight = 6).

### 1.2. The Core Operator: Convolution (Rolling <code>NdX</code> and Summation)

The most expensive and frequent operation is combining independent dice. This is **Discrete Convolution**.

**The Algorithm (Naive Convolution):**
Given two distributions <code>A</code> and <code>B</code>, the result <code>C = A + B</code> is calculated as:

<pre><code>For each (value_a, weight_a) in A:
    For each (value_b, weight_b) in B:
        C[value_a + value_b] += weight_a * weight_b
</code></pre>

**Complexity:** <code>O(|A| × |B|)</code>. This becomes slow for large dice pools (e.g., 100d6).

**Optimization Strategy (Fast Fourier Transform - FFT):**
To match AnyDice's performance on large pools (e.g., 50d6 or 10d100):

1. Convert the distribution into a **Polynomial Representation** (Probability Generating Function).
2. Use **Fast Fourier Transform (FFT)** to multiply the polynomials in the frequency domain.
3. Use Inverse FFT to get the result distribution.
4. _Note:_ This is essential for "large pool summation." It is **not** necessary for "highest/lowest" mechanics.

### 1.3. Handling Exploding Dice

Exploding dice introduce **potentially infinite outcomes**. AnyDice handles this with a configurable **Depth Limit**.

**The Algorithm (Recursive Expansion with Probability Mass Shift):**

1. Create a base distribution for a single non-exploding die <code>D</code>.
2. Identify the "trigger" values. By default, this is the **maximum possible value** of the die.
3. For each trigger value, remove its weight from the _stopping_ condition and allocate it to a _continuation_ condition.
4. **Important Distinction:** <code>[explode 2d6]</code> treats the collection as a single die and only explodes on the total maximum (12), whereas <code>2d[explode d6]</code> makes each die explode independently.
5. **Implementation via Matrix/Iteration:**

<pre><code>Result = Empty Distribution
For depth in 1..MaxDepth:
    BaseRoll = SingleDieResult
    Contribution = BaseRoll + ((depth-1) * TriggerValue)
    ProbabilityFactor = (P_trigger)^(depth-1) * (1 - P_trigger) // For final stop
    Result.Add(Contribution, ProbabilityFactor)
// Remaining "infinite" tail probability is discarded.
</code></pre>

6. **Depth Limit:** The implementation defaults to an explode depth of 8. Changing <code>maximum function depth</code> does not recompute it; use <code>set "explode depth" to X</code> to change it directly. Note that the highest number listed in the output will actually never be rolled; it represents "any possible result above this value."

### 1.4. Dependent Operations (Highest/Lowest of Pool)

This is where AnyDice shines. Standard convolution fails here because <code>highest 1 of 2d6</code> is **not** the sum of independent parts; it's a combinatorial selection.

**Recommended Implementation for Highest/Lowest:**
**Dynamic Programming (DP) / Multiset Enumeration.**
This is more flexible than FFT for dependent logic.

- **State:** <code>DP[count_rolled][current_sum]</code> = Weight.
- **Loop:** For each die face <code>v</code>, update DP table.
- **Pruning:** After the pool is generated, apply the filter "Keep Highest 2".

### 1.5. Comparison Operators (<code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>)

A comparison operation converts a **Die** into a **Boolean Die** (0 or 1).

**Mechanics:**
Given <code>D</code> and a constant <code>C</code>:

1. Iterate over <code>D</code>.
2. If <code>value &gt; C</code>, add weight to outcome <code>1</code>.
3. Else, add weight to outcome <code>0</code>.
4. **Result:** A new Die with outcomes <code>{0: W_false, 1: W_true}</code>.

**Counting Successes (e.g., <code>5d6 &gt; 4</code>):**
This is a **Binomial Distribution** if the dice are identical and independent.

- _Naive:_ Convolve the Boolean Die <code>N</code> times.
- _Optimized:_ Recognize the pattern and use Binomial Probability Mass Function directly.

### 1.6. Caching and Memoization Strategy

Dice probability computation is **recursive**. A user typing <code>output [explode d6] + [explode d6]</code> should compute the exploding d6 **once** and reuse it.

**Architecture Requirement:**

- Implement a **Global Calculation Cache**.
- **Key:** A normalized string representation of the AST node (e.g., <code>"Explode(Dice(6))"</code>).
- **Value:** The computed Distribution object.
- This is **critical** for performance.

### 1.7. Handling Impossible Values and Zero-Probabilities

- **Normalization:** After every operation, the sum of weights should be tracked as the <code>Total Combinations</code>.
- **Filtering:** Outcomes with a weight of <code>0</code> should be removed from the final display map to avoid cluttering graphs.
- **Mean Calculation:** <code>∑(Value × Weight) / TotalWeight</code>.

---

## Part 2: The Scripting Language and Its Environment

The AnyDice scripting language is a Domain-Specific Language (DSL) purpose-built for defining and analyzing dice mechanics.

### 2.1. Language Overview & Guiding Principles

- **Simplicity:** The syntax is meant to be readable by users without a programming background.
- **Correctness by Default:** The language enforces exact, analytical probability calculations, not Monte Carlo simulation.
- **Type-Driven Behavior:** A central feature is how functions behave differently based on the type of argument they receive (Number, Die, Sequence).

### 2.2. Lexical Structure (Tokenization)

- **Whitespace:** Spaces, tabs, and newlines are generally ignored except where they serve to separate tokens.
- **Comments:** Any text enclosed in backslashes <code>\ like this \</code> is treated as a comment and completely ignored by the parser. This is the _only_ comment syntax.
- **Identifiers:**
  - **Variables:** Must be composed of uppercase letters <code>A-Z</code> and underscores <code>\_</code>. Example: <code>MY_VARIABLE</code>, <code>ATTACK_BONUS</code>.
  - **Functions:** Consist of one or more lowercase words and variable identifiers. Example: <code>explode</code>, <code>highest of</code>, <code>count successes in</code>.
- **Literals:**
  - **Numbers:** Whole integers only (e.g., <code>3</code>, <code>10</code>, <code>0</code>). AnyDice does not natively support floating-point numbers in its syntax.
  - **Dice Notation:** Standard formats like <code>d6</code>, <code>2d20</code>, <code>d%</code> (alias for <code>d100</code>).
- **Operators:** <code>+</code>, <code>-</code>, <code>\*</code>, <code>/</code>, <code>^</code>, <code>=</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>&amp;</code>, <code>|</code>, <code>!</code>, <code>@</code>, <code>#</code>.
- **Keywords:** <code>output</code>, <code>named</code>, <code>function</code>, <code>if</code>, <code>else</code>, <code>loop</code>, <code>over</code>, <code>result</code>, <code>set</code>, <code>to</code>.
- **Delimiters:** <code>[ ]</code> (function invocation), <code>{ }</code> (function body, custom dice), <code>:</code> (type annotation, assignment).

### 2.3. Syntax and Grammar (Parsing)

#### 2.3.1. Program Structure

An AnyDice script is a sequence of statements:

- **Variable Assignment:** <code>X: 3</code> or <code>DAMAGE: 2d6 + 3</code>.
- **Output Directive:** <code>output 3d6 named "three dice"</code>. This tells the engine to calculate and display a probability distribution.

#### 2.3.2. Expressions

Expressions follow standard mathematical precedence:

1. Parentheses <code>( )</code>
2. Exponentiation <code>^</code> (only 0 or positive exponents)
3. Multiplication <code>\*</code>, Integer Division <code>/</code> (rounding toward zero)
4. Addition <code>+</code>, Subtraction <code>-</code>
5. Comparison operators: <code>=</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>
6. Boolean operators: <code>!</code> (Not), <code>&amp;</code> (And), <code>|</code> (Or)

**Important Nuance:** <code>if</code> statements do _not_ use parentheses around their condition. The syntax is simply <code>if CONDITION { ... }</code>.

#### 2.3.3. Dice Notation

The parser recognizes several forms of dice notation:

- **Basic Die:** <code>dX</code> (e.g., <code>d6</code>, <code>d20</code>). <code>d%</code> is an alias for <code>d100</code>.
- **Dice Pools:** <code>NdX</code> (e.g., <code>3d6</code>). The parser interprets this as a collection of dice to be summed.
- **Custom Dice:** <code>d{1, 2, 3, 4}</code> or <code>d{1..6}</code>. The parser creates a die with faces corresponding to the values in the comma-separated list or range.
- **Arbitrary Dice:** <code>1d(2d4)</code> is legal. The parser will evaluate the expression <code>(2d4)</code> first to create a custom die.

### 2.4. Type System

The language has three primary data types:

1. **Number:** A scalar integer value.
2. **Die:** A probability distribution over integer outcomes.
3. **Sequence:** An ordered collection of numbers.

**Sequences preserve their written order.** The <code>position order</code> setting (default `highest first`) controls positional access, digit access, and <code>sort</code>; it does not reorder sequence literals.

#### 2.4.1. Type Conversions and Operator Overloading

| Operator       | Left Type | Right Type        | Result Type | Behavior                                                                         |
| :------------- | :-------- | :---------------- | :---------- | :------------------------------------------------------------------------------- |
| <code>+</code> | Number    | Number            | Number      | Integer addition.                                                                |
| <code>+</code> | Die       | Die               | Die         | Convolution (sum of independent dice).                                           |
| <code>+</code> | Sequence  | Number            | Number      | The sequence is summed, then added to the number.                                |
| <code>@</code> | Number    | Sequence          | Number      | **Element Access**. <code>N@SEQ</code> retrieves the Nth element (1-indexed).    |
| <code>@</code> | Sequence  | Sequence          | Number      | The elements at the given positions are retrieved and summed.                    |
| <code>#</code> | Unary     | Sequence          | Number      | **Length Operator**. Returns the number of elements in the sequence.             |
| <code>#</code> | Unary     | (Dice Collection) | Number      | Returns the number of dice in the collection. A single die is a collection of 1. |
| <code>#</code> | Unary     | (Number)          | Number      | Returns the number of digits in the number.                                      |

**Sequence Comparison Behavior:**

- Compared to a number: The number is compared to each element in the sequence, and the resulting zeros and ones are summed.
- Compared to a die: The die is compared to the sum of all numbers in the sequence.
- Compared to a sequence: The sequences are compared number by number, from left to right, resulting in either a 1 or a 0.

**Function Parameter Types:** You can constrain a parameter to a specific type using a colon:

- <code>X:n</code> expects a Number.
- <code>X:d</code> expects a Die.
- <code>X:s</code> expects a Sequence.

**Behavior Based on Expected vs. Received Type:**

- **If expecting a Number (<code>:n</code>) but receive a Die:** The function is invoked _for every possible outcome of that die_. The results of all these invocations are then collected and returned as a new die. If a sequence is provided, it is summed.
- **If expecting a Sequence (<code>:s</code>) but receive a Die:** The die is "rolled" to produce every possible sorted sequence of results. The function is then invoked for each of those sequences, and the results are collected into a new die.

### 2.5. Variables and Scoping

- **Definition:** Variables are defined using <code>NAME: value</code>. The value is evaluated at the time of assignment.
- **Reassignment:** You can reassign a variable (e.g., <code>X: X \* 2</code>), which changes its value for the remainder of the script.
- **Scope:** Variables have **global scope** by default. Variables defined inside a function block are local to that function invocation and do not persist after it returns.
- **String Interpolation:** Variables can be accessed from inside a string using brackets. The variable's value will be converted to a string and replace the reference.

### 2.6. Functions

- **Definition:** <code>function: NAME PARAMETER... { BODY }</code>. The name is made of lowercase words and parameter variables; parameters may have a <code>:n</code>, <code>:d</code> or <code>:s</code> suffix. This matches the official AnyDice syntax (which does not use parentheses).
- **Return Value:** The <code>result: VALUE</code> statement immediately terminates the function and returns <code>VALUE</code>. If no <code>result:</code> is reached, the function returns the "empty die".
- **Invocation:** A function is called by placing its name and arguments in square brackets: <code>[function arg1 arg2 ...]</code>
- **Recursion:** Functions can call themselves. A <code>set "maximum function depth" to X</code> directive controls the recursion limit to prevent infinite loops. The default maximum function depth is 10.
- **Limitations:** It is not possible to provide <code>output</code> or to configure AnyDice while inside a function.

### 2.7. Control Flow

- **Conditional Execution:** <code>if CONDITION { ... } else { ... }</code>. <code>CONDITION</code> can be any expression; <code>0</code> is false, and any non-zero value is true.
- **Iteration:** The <code>loop VARIABLE over {RANGE} { ... }</code> construct. The range can be a literal like <code>{1..6}</code> or a sequence variable. This is essential for generating multiple outputs.

### 2.8. Built-in Directives

| Directive                                   | Purpose                                                                                          |
| :------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| <code>output EXPRESSION named "NAME"</code> | Commands the engine to calculate and display a probability distribution.                         |
| <code>set "VALUE" to X</code>               | Configures engine limits. Common values are:                                                     |
|                                             | <code>"maximum function depth"</code> (recursion limit, default 10)                              |
|                                             | <code>"explode depth"</code> (explosion limit, default 8; independent of maximum function depth) |
|                                             | <code>"position order"</code> (<code>"highest first"</code> or <code>"lowest first"</code>)      |

### 2.9. Output Views

AnyDice can present results in multiple ways:

- **Table:** Default view, enumerates all possible results with odds and a bar graph.
- **Graph:** Shows odds using connected dots on a grid.
- **Export:** Plain text CSV format with more significant digits.
- **Normal:** Exact odds of each individual value.
- **At Least:** Odds of getting at least the resulting values shown.
- **At Most:** Odds of getting at most the resulting values shown.
- **Transposed:** Groups results by value instead of by mechanic.

**Output Statistics:**

- The average (mean) of all possible results is shown after the name of each output. This value need not be a possible result itself.
- The population standard deviation is also displayed in the output.
- Both statistics are calculated using double-precision floating-point at display time.

---

## Part 3: Data Types and Their Internal Representation

### 3.1. The Number Type

**Internal Representation:**

- **Storage:** A signed 64-bit integer (<code>int64_t</code> equivalent).
- **Zero and Negative Values:** Supported natively.

**Special Considerations:**

- **Floating-Point Absence:** The language syntax only allows whole numbers. However, **output statistics** (mean, standard deviation) may be calculated using double-precision floats at the very end of computation.

### 3.2. The Sequence Type

A sequence is an **ordered collection of numbers**.

**Internal Representation:**

- **Data Structure:** A dynamic array (vector) of 64-bit integers.
- **Ordering:** **Sequences preserve their written order.** <code>sort</code> applies the <code>position order</code> setting, and position order also controls dice-collection and digit access. This follows the official introspection examples (<code>1@{2,4,6} = 2</code>).
- **Immutability:** Sequences are **immutable** data structures.

**Sequence Definition Syntax:**

- <code>{1, 2, 3}</code>: Basic sequence
- <code>{1..3}</code>: Range (equivalent to <code>{1, 2, 3}</code>)
- <code>{1:4, 2, 3}</code>: Repetition (four 1's, one 2, one 3)
- <code>{1..3:2}</code>: Repeated range (<code>{1, 2, 3, 1, 2, 3}</code>)
- <code>{{1,2,4}:2, 5, 6}</code>: Nested repetition
- <code>{d4}</code>: Convert a die to a sequence
- <code>{}</code>: The empty sequence

**Operations and Complexity:**

| Operation            | Internal Action                                                                                | Complexity        |
| :------------------- | :--------------------------------------------------------------------------------------------- | :---------------- |
| <code>SEQ + N</code> | Mathematical operations sum all sequence values, so this behaves as <code>SUM(SEQ) + N</code>. | <code>O(n)</code> |
| <code>N @ SEQ</code> | Direct index access <code>SEQ[N-1]</code> (1-indexed).                                         | <code>O(1)</code> |
| <code>#SEQ</code>    | Return length of vector.                                                                       | <code>O(1)</code> |

### 3.3. The Die Type (Probability Distribution)

**Internal Representation:**
A Die is represented by a **Probability Mass Function (PMF)** mapping integer outcomes to **integer weights**.

**Two Storage Modes (Hybrid Approach Recommended):**

| Mode            | Structure                                             | Best For                                    | Example                             |
| :-------------- | :---------------------------------------------------- | :------------------------------------------ | :---------------------------------- |
| **Dense Array** | A contiguous array (vector) of integers.              | Small range, few gaps.                      | <code>weights[outcome - min]</code> |
| **Sparse Map**  | A hash map mapping <code>outcome -&gt; weight</code>. | Large range, many zeros, or exploding dice. | <code>map[97] += 1</code>           |

**Essential Fields (Metadata):**

- <code>total_weight</code>: The sum of all weights.
- <code>min_outcome</code>: The smallest outcome with non-zero weight.
- <code>max_outcome</code>: The largest outcome with non-zero weight.
- <code>mean</code>: Pre-calculated sum of <code>(value \* weight)</code> divided by <code>total_weight</code>.

**Empty Die:** <code>d{}</code> represents a die with no outcomes (total weight 0). Operations on an empty die should propagate emptiness. <code>[maximum of d{}]</code> returns 0.

### 3.4. Type Conversion Mechanics (The "Function Evaluation" Core)

#### 3.4.1. Argument is Die, Parameter expects Number (<code>:n</code>)

**Behavior:** **Implicit Summation Over Distribution** (also known as "Roll and Evaluate").

**Algorithm:**

1. Take the input Die (a map of outcomes to weights).
2. Create an empty Result Die (sparse map).
3. For each <code>(value, weight)</code> in the input Die:
   - Call the function body with the Number <code>value</code>.
   - Process the return value and merge into Result Die.
4. Return the Result Die.

#### 3.4.2. Argument is Die, Parameter expects Sequence (<code>:s</code>)

**Behavior:** **Implicit Enumeration of Sorted Rolls**.

**Algorithm:**

1. Determine the number of dice <code>N</code> in the pool.
2. Generate all possible sorted sequences of the <code>N</code> dice.
3. For each unique sorted sequence, calculate its probability weight.
4. For each <code>(sequence, weight)</code>:
   - Call the function body with the Sequence.
   - Process the return value and merge into Result Die.
5. Return the Result Die.

#### 3.4.3. Argument is Sequence, Parameter expects Die (<code>:d</code>)

**Behavior:** The Sequence is **summed and treated as a number**, then promoted to a constant die.

- The Sequence <code>[5, 2, 2]</code> becomes the constant die with outcome <code>9</code>.
- This follows the official Functions documentation for a die parameter receiving a sequence.

#### 3.4.4. Argument is Number, Parameter expects Die/Sequence

**Behavior:** **Implicit Promotion**. The Number is promoted to a Die with a single outcome (weight 1) or a Sequence of length 1.

### 3.5. Summary Table of Type Interactions

| Argument Type | Parameter Expectation | Internal Action                                                                       |
| :------------ | :-------------------- | :------------------------------------------------------------------------------------ |
| **Number**    | <code>:n</code>       | Pass integer value directly.                                                          |
| **Number**    | <code>:s</code>       | Wrap integer in a 1-element sequence.                                                 |
| **Number**    | <code>:d</code>       | Wrap integer in a single-outcome die (weight 1).                                      |
| **Sequence**  | <code>:n</code>       | Sum the sequence and pass as a number.                                                |
| **Sequence**  | <code>:s</code>       | Pass sequence directly.                                                               |
| **Sequence**  | <code>:d</code>       | Sum the sequence, then wrap it in a single-outcome die.                               |
| **Die**       | <code>:n</code>       | Iterate over all outcomes; call function per outcome; collect results.                |
| **Die**       | <code>:s</code>       | Enumerate all possible sorted sequences; call function per sequence; collect results. |
| **Die**       | <code>:d</code>       | Pass die directly.                                                                    |

---

## Part 4: Built-in Functions and Operations

### 4.1. Core Operators

| Operator           | Name                  | Operand Types                    | Result          | Behavior & Implementation                                                                                           |
| :----------------- | :-------------------- | :------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------ |
| <code>+</code>     | Addition              | <code>Number + Number</code>     | Number          | Integer addition.                                                                                                   |
|                    |                       | <code>Die + Die</code>           | Die             | **Convolution** (sum of independent dice).                                                                          |
|                    |                       | <code>Die + Number</code>        | Die             | **Shift**. Adds constant to all outcomes.                                                                           |
|                    |                       | <code>Sequence + Number</code>   | Number          | Mathematical operations sum all sequence values first.                                                              |
|                    |                       | <code>Sequence + Sequence</code> | Number          | Both sequences are summed, then added as numbers.                                                                   |
| <code>-</code>     | Subtraction           | <code>Number - Number</code>     | Number          | Integer subtraction.                                                                                                |
|                    |                       | <code>Die - Die</code>           | Die             | Convolution with negative right operand.                                                                            |
|                    |                       | <code>Die - Number</code>        | Die             | Shift outcomes by <code>-N</code>.                                                                                  |
| <code>\*</code>    | Multiplication        | <code>Number \* Number</code>    | Number          | Integer multiplication.                                                                                             |
|                    |                       | <code>Die \* Number</code>       | Die             | Multiply all outcomes by <code>N</code>.                                                                            |
|                    |                       | <code>Die \* Die</code>          | Die             | **Convolution** (product of independent dice).                                                                      |
| <code>/</code>     | Integer Division      | <code>Number / Number</code>     | Number          | Integer division, **rounding toward zero**.                                                                         |
|                    |                       | <code>Die / Number</code>        | Die             | Integer division of all outcomes by <code>N</code>.                                                                 |
| <code>^</code>     | Exponentiation        | <code>Number ^ Number</code>     | Number          | Exponentiation (only 0 or positive exponents).                                                                      |
| <code>=</code>     | Equal                 | <code>Any = Any</code>           | Number (0 or 1) | Returns 1 if operands are equal, else 0.                                                                            |
| <code>!=</code>    | Not Equal             | <code>Any != Any</code>          | Number (0 or 1) | Returns 1 if operands are not equal, else 0.                                                                        |
| <code>&lt;</code>  | Less Than             | <code>Any &lt; Any</code>        | Number (0 or 1) | Returns 1 if left operand is less than right operand.                                                               |
| <code>&gt;</code>  | Greater Than          | <code>Any &gt; Any</code>        | Number (0 or 1) | Returns 1 if left operand is greater than right operand.                                                            |
| <code>&lt;=</code> | Less Than or Equal    | <code>Any &lt;= Any</code>       | Number (0 or 1) | Returns 1 if left operand is less than or equal to right operand.                                                   |
| <code>&gt;=</code> | Greater Than or Equal | <code>Any &gt;= Any</code>       | Number (0 or 1) | Returns 1 if left operand is greater than or equal to right operand.                                                |
| <code>&amp;</code> | Logical And           | <code>Number &amp; Number</code> | Number (0 or 1) | Boolean AND. 0 is false, any other number is true.                                                                  |
| <code>\|</code>    | Logical Or            | <code>Number \| Number</code>    | Number (0 or 1) | Boolean OR.                                                                                                         |
| <code>!</code>     | Logical Not           | <code>!Number</code>             | Number (0 or 1) | Boolean NOT.                                                                                                        |
| <code>@</code>     | Access                | <code>Number @ Sequence</code>   | Number          | Returns the element at the 1-based index.                                                                           |
|                    |                       | <code>Sequence @ Sequence</code> | Number          | Returns the sum of elements at the given indices.                                                                   |
|                    |                       | <code>Number @ Die</code>        | Die             | Returns a die of the <code>N</code>-th highest/lowest rolls (depending on position order).                          |
|                    |                       | <code>Number @ Number</code>     | Number          | Returns the digit at the specified position (1 = most significant digit). <code>1@246</code> yields <code>2</code>. |
| <code>#</code>     | Length                | <code>#Sequence</code>           | Number          | Returns the number of elements in the sequence.                                                                     |
|                    |                       | <code>#(Collection)</code>       | Number          | Returns the number of dice in the collection.                                                                       |
|                    |                       | <code>#Number</code>             | Number          | Returns the number of digits in the number.                                                                         |

### 4.2. Built-in Functions

#### 4.2.1. Selection and Aggregation (<code>@</code> Operator)

- **Syntax:** <code>SELECTION @ POOL</code>
- **<code>SELECTION</code>:** Can be a number (e.g., <code>1</code>) or a sequence (e.g., <code>{1,2}</code>).
- **<code>POOL</code>:** A collection of dice (e.g., <code>3d6</code>).

**Algorithm (for <code>N @ POOL</code>):**

1. The dice pool is evaluated to produce every possible combination of outcomes.
2. For each combination, the outcomes are **sorted according to the <code>position order</code> setting** (default: highest first).
3. The element(s) at the specified <code>SELECTION</code> index/indices are retrieved.
4. If <code>SELECTION</code> is a sequence of indices, the retrieved values are **summed**.
5. If a position does not exist, the result for that position is 0.
6. The results are collected into a new Die.

**Examples:**

- <code>1@3d6</code>: Selects the highest roll from <code>3d6</code> (the "advantage" mechanic).
- <code>3@3d6</code>: Selects the lowest roll.
- <code>{1,2}@4d6</code>: Sums the highest two rolls of <code>4d6</code> (the classic D&D ability score roll).
- **Single Die:** A single die is considered a collection containing one die. <code>1@d6</code> returns the single value of the die.

#### 4.2.2. <code>highest NUMBER of DICE</code>

- **Syntax:** <code>[highest NUMBER of DICE]</code> or <code>[highest NUMBER of DICE and DICE ...]</code>
- **Implementation:** <code>{1..NUMBER}@DICE</code>; mixed pools select from all dice together.
- **Example:** <code>[highest 3 of 4d6]</code> sums the highest three rolls of 4d6. <code>[highest 3 of 3d6 and 1d8]</code> selects the highest three values across all four dice.

#### 4.2.3. <code>lowest NUMBER of DICE</code>

- **Syntax:** <code>[lowest NUMBER of DICE]</code> or <code>[lowest NUMBER of DICE and DICE ...]</code>
- **Implementation:** <code>{(#DICE - NUMBER + 1)..#DICE}@DICE</code>; mixed pools select from all dice together.
- **Example:** <code>[lowest 3 of 4d6]</code> sums the lowest three rolls of 4d6.

#### 4.2.4. <code>middle NUMBER of DICE</code>

- **Syntax:** <code>[middle NUMBER of DICE]</code>
- **Behavior:** Yields the sum of the middle <code>NUMBER</code> values rolled by <code>DICE</code>. Dice positions are rounded down.
- **Example:** <code>[middle 1 of 4d6]</code> selects the second die (since middle of four is rounded down).

#### 4.2.5. <code>highest of A and B</code>

- **Syntax:** <code>[highest of A and B]</code>
- **Implementation:** <code>if A &gt; B { result: A } result: B</code>
- **Example:** <code>[highest of d6 and 4]</code>

#### 4.2.6. <code>lowest of A and B</code>

- **Syntax:** <code>[lowest of A and B]</code>
- **Implementation:** <code>if A &lt; B { result: A } result: B</code>
- **Example:** <code>[lowest of d4 and d6]</code>

#### 4.2.7. <code>maximum of DIE</code>

- **Syntax:** <code>[maximum of DIE]</code>
- **Behavior:** Yields the highest number on the <code>DIE</code>. In case of the empty die, this is 0.
- **Example:** <code>[maximum of 3d6]</code> yields 18.

#### 4.2.8. <code>absolute NUMBER</code>

- **Syntax:** <code>[absolute NUMBER]</code>
- **Behavior:** Yields the absolute value of the <code>NUMBER</code>, discarding the sign.
- **Implementation:** <code>if NUMBER &lt; 0 { result: -NUMBER } result: NUMBER</code>

#### 4.2.9. <code>SEQUENCE contains NUMBER</code>

- **Syntax:** <code>[SEQUENCE contains NUMBER]</code>
- **Behavior:** Yields 1 if the <code>NUMBER</code> occurs at least once in the <code>SEQUENCE</code>, otherwise 0.
- **Implementation:** <code>result: (SEQUENCE = NUMBER) &gt; 0</code>

#### 4.2.10. <code>count VALUES in SEQUENCE</code>

- **Syntax:** <code>[count VALUES in SEQUENCE]</code>
- **Behavior:** Counts how often any of the listed <code>VALUES</code> occur in the <code>SEQUENCE</code>. Repeated values in <code>VALUES</code> are counted repeatedly (for example, <code>{4..6, 6}</code> counts 6 twice).
- **Example:** <code>[count {5,6} in 11d6]</code> is a standard dice pool success counter.

#### 4.2.11. <code>explode DIE</code>

- **Syntax:** <code>[explode DIE]</code>
- **Behavior:** Keeps rolling the die as long as its maximum possible value is rolled. The final result is the sum of all rolled values.
- **Important:** A dice collection is treated as a single die. <code>[explode 2d6]</code> only explodes when a total of 12 is rolled. Use <code>2d[explode d6]</code> for independent explosions.
- **Depth Limit:** Controlled by <code>set "explode depth" to X</code> (default 8).
- **Variant Explosions:** Custom explosion conditions can be implemented by checking the rolled value and recursively calling the explode function with a custom die. For example, exploding on values greater than 3: <code>function: explode N:n { if N > 3 { result: N + [explode d6] } result: N }</code>

#### 4.2.12. <code>reverse SEQUENCE</code>

- **Syntax:** <code>[reverse SEQUENCE]</code>
- **Behavior:** Yields the <code>SEQUENCE</code> in reverse order.
- **Example:** <code>1@[reverse {1..6}]</code> yields 1 (the lowest element).

#### 4.2.13. <code>sort SEQUENCE</code>

- **Syntax:** <code>[sort SEQUENCE]</code>
- **Behavior:** Yields the <code>SEQUENCE</code> with its elements sorted according to the position order setting (highest to lowest by default).

### 4.3. Implementation Strategy

1. **Implement Core Operators:** Build the arithmetic, comparison, and logical operators first.
2. **Implement <code>@</code> Operator:** This unlocks <code>highest</code>, <code>lowest</code>, and <code>middle</code> for free.
3. **Implement <code>count</code> and <code>contains</code>:** These rely on the same sequence-enumeration logic.
4. **Implement <code>explode</code>:** Requires a robust recursion limit.
5. **Implement the Parser and Type System:** Build the full parser after core operations are solid.

---

## Part 5: System Architecture

### 5.1. High-Level Component Diagram

<pre><code>┌─────────────────┐
│   User Input    │ (Script text)
└────────┬────────┘
         ▼
┌─────────────────┐
│      Lexer      │ (Tokenization)
└────────┬────────┘
         ▼
┌─────────────────┐
│     Parser      │ (AST Construction)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Semantic       │ (Type resolution, variable binding)
│   Analyzer      │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Evaluator     │◄───────────┐
│                 │            │
└────────┬────────┘            │
         │                     │
         ▼                     │
┌─────────────────┐    ┌───────┴───────┐
│  Distribution   │    │  Global Cache │
│   Engine        │◄───┤   (Memoizer)  │
└────────┬────────┘    └───────────────┘
         ▼
┌─────────────────┐
│ Output Formatter│ (Text, JSON, SVG, HTML)
└────────┬────────┘
         ▼
┌─────────────────┐
│   Frontend      │ (CLI, Web Server)
└─────────────────┘
</code></pre>

### 5.2. Component Descriptions

#### 5.2.1. Lexer (Tokenization)

- **Input:** Raw string of the script.
- **Output:** A stream of Token objects.
- **Responsibilities:**
  - Strip comments (text between backslashes <code>\</code>).
  - Recognize keywords, operators, literals, and identifiers.
  - Handle whitespace as separators.

#### 5.2.2. Parser

- **Input:** Token stream from the Lexer.
- **Output:** Abstract Syntax Tree (AST).
- **Parsing Technique:** Recursive Descent or Pratt Parser.

#### 5.2.3. Semantic Analyzer

- **Input:** AST.
- **Output:** Annotated AST with type information and resolved variable references.
- **Responsibilities:**
  - Variable Resolution
  - Function Resolution
  - Type Checking
  - Constant Folding

#### 5.2.4. Evaluator (Interpreter)

- **Input:** Annotated AST and a runtime environment.
- **Output:** For each <code>output</code> statement, a Die object.

#### 5.2.5. Distribution Engine

- **Input:** Calls from the Evaluator for dice operations.
- **Output:** Die objects (distributions).
- **Internal Components:**
  - <code>Die</code> class with sparse/dense hybrid representation.
  - Convolution routine.
  - Order statistics routine.
  - Explosion routine.

#### 5.2.6. Global Cache (Memoizer)

- **Purpose:** Avoid recomputing identical dice distributions.
- **Implementation:** A hash map (key -&gt; Die object).
- **Immutability Requirement:** The Die objects stored in the cache must be immutable.

#### 5.2.7. Output Formatter

- **Input:** A list of <code>(name, Die)</code> pairs.
- **Output:** A formatted string or data structure.
- **Capabilities:** Text (CLI), JSON, SVG/Canvas, HTML.

#### 5.2.8. Frontend / Application Layer

- **Command-Line Interface (CLI)**
- **Web Server (HTTP API)**
- **Web Interface (Static Assets)**

### 5.3. Data Flow Walkthrough: A Simple Example

**Script:** <code>output 2d6 + 3 named "Sword Damage"</code>

1. **Lexer:** Tokenizes.
2. **Parser:** Builds AST.
3. **Semantic Analyzer:** Passes.
4. **Evaluator:** Evaluates <code>2d6</code> → creates Die <code>{2..12}</code>, adds constant 3 → shifts outcomes to <code>{5..15}</code>.
5. **Output Formatter:** Receives <code>("Sword Damage", Die)</code> and generates output.
6. **Frontend:** Displays the result.

---

## Part 6: Implementation Considerations and Advanced Topics

### 6.1. Performance Optimization Techniques

- **Caching:** Most important.
- **Lazy Evaluation:** Do not compute a distribution until it is required by an <code>output</code> statement.
- **Convolution Selection:** Use naïve convolution for small dice, FFT-based convolution for large pools.
- **Sparse vs. Dense:** Dynamically switch representation to balance memory and speed.
- **Timeouts:** Implement a configurable timeout (e.g., 5 seconds).

### 6.2. Memory Management and Large Distributions

#### 6.2.1. Dealing with Exploding Distributions

- **Depth Limit:** Halt recursion after <code>MAXDEPTH</code>. The tail probability is discarded.
- **Normalization:** Do **not** re-normalize; display probabilities relative to the original total weight.

#### 6.2.2. Pool Size Limits for Sequence Operations

- Enforce a maximum pool size for <code>:s</code> parameters.

#### 6.2.3. Output Truncation

- Use bucketing for display only. Cap the number of displayed points.

### 6.3. Testing Strategy

- **Unit Tests for Core Operations:** Test against known analytical results.
- **Regression Tests for Known Scripts:** Compare against actual AnyDice website.
- **Monte Carlo Cross-Validation:** Compare exact distribution against simulation.
- **Performance Benchmarks:** Track execution time and memory usage.

### 6.4. Security Considerations

- **Arbitrary Code Execution:** The DSL does not allow arbitrary system access.
- **Resource Limits:** Timeout, memory limit, recursion depth, input size limit.

### 6.5. Summary Implementation Roadmap

1. **Phase 1: Core Math Engine** — implemented with exact bigint weights.
   - <code>Die</code> representation, arithmetic, comparisons and convolution.
   - Memoization is still open.
2. **Phase 2: Parser and Evaluator** — implemented.
   - Chevrotain lexer/parser, typed AST, evaluator, variables, functions and
     control flow.
3. **Phase 3: Built-in Library** — implemented, including the full official
   function library and multi-pool variants.
4. **Phase 4: Frontend and Integration** — implemented outside the library.
   - The application UI lives in `src/probability-calculator/`; the library
     remains UI-agnostic.
5. **Phase 5: Optimization and Polish** — partially complete.
   - Exact tests and official-doc/article regressions are in place.
   - FFT convolution, caching and output-view helpers remain future work.

---

_This document provides a comprehensive, language-agnostic blueprint for building a dice probability calculator with the same functionality and power as AnyDice, verified against the official AnyDice documentation._
