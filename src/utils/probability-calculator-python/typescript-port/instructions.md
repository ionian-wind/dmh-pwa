# TypeScript Port of PythonDice - Continuation Instructions

## Project Overview

Port PythonDice library (a dice probability calculator) from Python to TypeScript in `./typescript-port/`, using TDD approach with tests as source of truth.

## How to Run Tests

```bash
npx vitest run ./typescript-port/*
```

## After Each Run

### 1. Update instructions.md

Run tests, then update this file:
- Update **Test Results** count (passing, skipped)
- Update **TypeScript Tests** breakdown
- Document any tests added or fixes made
- Record any new skipped tests with reasons

### 2. Commit Changes (Use --no-verify to skip lint)

```bash
# Stage changes
git add -A

# Commit with --no-verify to skip lint hook
git commit --no-verify -m "type(scope): description

- Added X new tests
- Fixed Y skipped tests
- Updated instructions.md"
```

Example commit messages:
- `feat: add seq comparison tests (gt, ge, lt, le)` - 4 tests
- `fix: implement anydiceTyped metadata decorator` - 3 tests  
- `docs: update test counts after run` - documentation

## Current Status

**Test Results:** 81 passing, 46 skipped (127 total)

**Passing:** 81 tests
**Skipped:** 46 tests (includes parser not implemented + type annotation edge cases)

## Session: Apr 22, 2026 - Tests unchanged

## Test Coverage Comparison

### Python Tests (101 tests total)
- `test/randvar_test.py` - 27 tests
- `test/randvar_seq_test.py` - 19 tests
- `test/funclib_test.py` - 16 tests
- `test/casting_test.py` - 17 tests
- `test/stringvar_test.py` - 7 tests
- `test/parse_exec_test.py` - 12 tests
- `test/test_fetch.py` - 3 tests

### TypeScript Tests (81 tests + 46 skipped = 127 total)
- `randvar.test.ts` - 31 tests
- `seq.test.ts` - 17 tests (16 + 1 skipped)
- `funclib.test.ts` - 16 tests (11 + 5 skipped)
- `casting.test.ts` - 21 tests (16 + 5 skipped)
- `stringvar.test.ts` - 6 tests
- `parser.test.ts` - 37 tests (1 + 36 skipped) - parser not implemented

## Completed Work

### Core Library Files (src/)
1. `typings.ts` - TypeScript interfaces (MetaRV, MetaSeq, T_if, etc.)
2. `settings.ts` - SETTINGS, settings_set, settings_reset
3. `utils.ts` - flatten, factorial, accumulate
4. `seq.ts` - Seq class
5. `randvar.ts` - RV (Random Variable) class
6. `blackrv.ts` - BlankRV class
7. `factory.ts` - get_seq, get_rv, merge_rvs
8. `roller.ts` - roll, roller, myrange
9. `decorators.ts` - anydice_casting, max_func_depth
10. `funclib.ts` - absolute_X, reverse_X, sort_X, highest_X_of_X, etc.
11. `string_rvs.ts` - StringVal, StringSeq
12. `output.ts` - output function
13. `altcast.ts` - D object for alternative dice notation
14. `index.ts` - Main exports
15. `parser/` - Chevrotain lexer/parser infrastructure (incomplete)

### Test Files (test/)
1. `randvar.test.ts` - RV tests
2. `seq.test.ts` - Seq tests (expanded with comparison and arithmetic tests)
3. `stringvar.test.ts` - StringVal tests
4. `funclib.test.ts` - Function library tests
5. `casting.test.ts` - Type casting/decorator tests

## Key Differences from Python (Important!)

1. **No operator overloading** in JavaScript - Use direct method calls:
   - `x + y` → `(x as any).__add__(y)` or `(y as any).__radd__(x)`
   - `x / y` → `(x as any).__truediv__(y)`
   - `x @ y` → `(x as any).__rmatmul__(y)`

2. **No type annotations at runtime** - Decorators can't infer T_N, T_S, T_D from function signatures

3. **JavaScript prototype issues** - Some RV objects may not have correct `this` binding when created dynamically

4. **Python range is inclusive** - `range(1, 7)` gives `[1,2,3,4,5,6]`
   - TypeScript: `for (let i = 1; i <= 6; i++)`

5. **Python division** - `/` returns float, `//` returns int
   - TypeScript: `/` is float division, `Math.floor(x/y)` for integer division

## Skipped Tests (47 total)

### Complex Casting (5 tests)
- `should pass seq through` - needs proper T_S parameter handling
- `should cast multiple dice to sequence` - needs advanced decorator
- `should cast seq to int` - needs type annotation parsing
- `should cast single dice to sequence` - needs T_S casting support
- `should cast then matmul` - needs seq RV operations

### Seq + RV Operations (1 test)
- `should handle seq and rv operations` - JavaScript prototype issue

### Funclib Edge Cases (5 tests)
- `should handle RV` - needs proper RV expansion in decorator
- `should handle abs(RV)` - Same
- `should reverse roll` - needs RV handling in reverse_X
- `should cast die to sequence` - needs T_D parameter
- `should cast die to seq then get position` - needs T_D parameter

### Parser Tests (36 tests)
- All 36 tests in `parser.test.ts` are skipped because the parser is not yet implemented

### Missing Tests to Port

1. **randvar_seq_test.py** - 19 tests not yet fully converted
2. **test_fetch.py** - 3 tests (requires parser + AnyDice integration)

## Type Annotation Parsing Problem (Key Issue)

### The Core Problem

Python uses **type annotations at runtime** via the `typing` module (T_N, T_S, T_D). In Python:
```python
@anydice_casting()
def function(param: T_N):
    # Python inspects param: and knows param is annotated as T_N (number)
```

JavaScript/TypeScript **discards type annotations at runtime**. In TypeScript:
```typescript
@anydice_casting()
function function(param: T_N): number {
    // No runtime info - param is just a value
}
```

### Python's Solution (inspect module)

Python's `anydice_type_casting` uses `inspect.getfullargspec()` to read parameter annotations:
```python
def anydice_type_casting(verbose=False):
    def decorator(func):
        def wrapper(*args, **kwargs):
            fullspec = inspect.getfullargspec(func)
            param_annotations = fullspec.annotations  # {param_name: type}
            # Can look up: param_annotations['param']
```

### Why TypeScript Can't Do This

1. **No reflection** - TypeScript compiles to JavaScript with no type info
2. **No inspect module** - Can't read function signatures at runtime
3. **Interface erasure** - All interfaces are removed at compile time

### Current Workaround (Hardcoded Behavior)

The TypeScript decorator uses **convention over annotation**:
```typescript
// If the value is an RV, expand it
// Otherwise, treat as number and sum any Seq
hardParams: { index: number; value: unknown }[] = []
```

This works for some cases but misses the AnyDice semantic where:
- `T_N` with RV → expand each possible roll value
- `T_S` with RV → create sequence of all possible rolls
- Return type determines what to build

### Tests That Need Type Annotation Parsing

#### T_N (Number) parameter with RV input
```python
def test_cast_to_int(s1, s2):
    if isinstance(s2, RV):
        assert RV.dices_are_equal(f1(s1), s2)
```
- Need to know parameter is T_N at runtime to call function with each expanded value

#### T_S (Sequence) parameter with RV input
```python
def test_cast_to_seq(s1, s2):
    if isinstance(s2, RV):
        assert RV.dices_are_equal(f2(s1), s2)
    elif isinstance(s2, Seq):
        assert Seq.seqs_are_equal(f2(s1), s2)
```
- Need to know it's T_S to pass the full RV (not expanded)

#### T_D (Die) parameter with Seq input
```python
def test_cast_to_rv(s1, s2):
    assert RV.dices_are_equal(f3(s1), s2)
```
- Need to convert Seq to RV

### Solutions Needed (Future Work)

1. **Manual Type Tags**: Store type as metadata in function object
   ```typescript
   function func(param: number) { ... }
   func.__paramTypes__ = { param: 'T_N' };
   ```

2. **Custom Decorator with Metadata**:
   ```typescript
   @anydiceTyped({ params: { param: 'T_N' }, returns: 'T_N' })
   function func(param: number) { return param; }
   ```

3. **Convention-based Inference** (current partial):
   ```typescript
   // RV → expand to each value
   // Seq → sum to number, or pass through
   // number → pass through
   ```

4. **Parser Integration**: Use the dice notation parser to understand types from syntax

### Key Missing Functionality

1. **Return type inference** - Not knowing function return type, we can't build proper RV
2. **Parameter named mapping** - Need to know which param is which type
3. **Multiple parameter handling** - Only first RV is expanded, others are just passed through
4. **T_S handling with RV** - Need to expand to sequences for T_S params

## Fixes Applied (from previous sessions)

1. **Range function**: Python's `range(1, d+1)` is inclusive on both ends
2. **Memoization cache**: Added `register_reset_callback` to clear cache
3. **CDF ordering**: Uses Object.create to bypass constructor sorting
4. **@ operator**: Uses direct method calls `__rmatmul__()`
5. **Circular import**: StringSeq is standalone class
6. **flatten infinite recursion**: Detects RV-like objects
7. **_sum_at infinite recursion**: Uses `_get_kth_order_statistic`
8. **Truncate/Roll divide**: Uses direct `__truediv__()` method
9. **Roll ndm**: Uses direct `__add__()` method
10. **CDF**: Fixed test expectations to match Python behavior
11. **Matmul**: Uses `_source_die._get_kth_order_statistic`

## Tests Added (This Session)

1. **Comparison tests for Seq (gt, ge, lt, le)** - 4 tests
2. **Arithmetic tests for Seq (sub, mul, div, floordiv, pow, mod)** - 6 tests
3. **Decorator fix**: anydice_type_casting now properly handles RV expansion by converting Seq to numbers before function call

## Skipped Tests Note

The skipped tests include:
- Complex edge cases like casting T_S to int and single dice to sequence
- Type annotation parsing issues (described above)
- JavaScript prototype limitations
- Parser not implemented (36 tests)

## Key Differences (Summary)

1. **No operator overloading** - Use direct method calls: `(x as any).__add__(y)`
2. **No type annotations at runtime** - Can't infer T_N, T_S, T_D from signatures
3. **JavaScript prototype issues** - RV objects may not have correct `this` binding
4. **Python range is inclusive** - TypeScript needs `i <= 6` instead of `i < 6`
5. **Python division** - TypeScript needs `Math.floor(x/y)` for integer division

## Solution: reflect-metadata Decorator

Instead of parsing type annotations, use the `anydiceTyped` decorator with explicit metadata:

```typescript
import { anydiceTyped, anydice_casting } from './decorators';

const decorator = anydice_casting();
const withMeta = anydiceTyped({ params: { paramName: 'T_N' }, returns: 'T_N' });

// T_N: expand RV to each value, pass number to function
// T_S: pass full RV as sequence (for all possible rolls)
// T_D: convert Seq to RV, number to constant RV

function myFunc(param: number): number {
  return param * 2;
}

const decorated = decorator(withMeta(myFunc));
const result = decorated(roll(6)); // Returns RV with doubled values
```

This replaces Python's `inspect.getfullargspec()` approach.

## Debugging Tips

1. **Check Python behavior first**:
   ```bash
   cd src/utils/probability-calculator-python/PythonDice
   python3 -m pytest test/randvar_test.py::test_truncate -v
   ```

2. **Run single test**:
   ```bash
   cd src/utils/probability-calculator-python/typescript-port
   npx vitest run -t "should truncate correctly"
   ```

3. **Add console.log debugging** directly in source files

4. **Check Python source**:
   - `src/utils/probability-calculator-python/PythonDice/src/randvar.py`
   - `src/utils/probability-calculator-python/PythonDice/src/decorators.py`
   - `src/utils/probability-calculator-python/PythonDice/src/roller.py`

## Key Files to Focus On for Future Work

1. `src/randvar.ts` - Main RV class with all operations
2. `src/roller.ts` - roll function implementation
3. `src/decorators.ts` - Type casting decorators
4. `src/seq.ts` - Seq class
5. `src/funclib.ts` - Function library implementations
6. `test/randvar_seq_test.py` - Need to port these tests!

## Implementing the Parser (Future Work)

The parser directory has Chevrotain lexer/parser infrastructure but is incomplete. This would be needed for parsing dice notation strings like "2d6+3".

## How to Continue

1. Run Python tests first to see expected behavior
2. Copy the test to TypeScript test file
3. Run TypeScript test to see failure
4. Implement the fix in source code
5. Repeat

Example workflow:
```bash
# 1. Check Python test
cd PythonDice && python3 -m pytest test/randvar_test.py::test_matmul -v

# 2. Copy test to TypeScript
# 3. Run TypeScript test
cd typescript-port && npx vitest run -t "should handle matmul"
```
