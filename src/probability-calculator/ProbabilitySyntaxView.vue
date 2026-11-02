<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IconArrowLeft, IconBook2 } from '@tabler/icons-vue';

const router = useRouter();

interface OperatorRow {
  syntax: string;
  meaning: string;
  example: string;
}

interface FunctionRow {
  syntax: string;
  meaning: string;
}

interface Example {
  title: string;
  code: string;
}

const operators: OperatorRow[] = [
  {
    syntax: '+ - * /',
    meaning: 'Arithmetic. Integer division rounds toward zero.',
    example: 'output 2d6 + 3',
  },
  {
    syntax: '^',
    meaning: 'Exponentiation with a non-negative integer exponent.',
    example: 'output 2 ^ 3',
  },
  {
    syntax: '= != < > <= >=',
    meaning: 'Comparison. Produces a 0/1 die when applied to dice.',
    example: 'output 3d6 >= 15',
  },
  {
    syntax: '& | !',
    meaning:
      'Boolean and, or and not. Zero is false; any other number is true.',
    example: 'output 1d6 > 3 & 1d6 != 6',
  },
  {
    syntax: '@',
    meaning: 'Position access on a sequence, dice collection or number digits.',
    example: 'output 1@3d6',
  },
  {
    syntax: '#',
    meaning:
      'Length of a sequence or dice collection; number of digits for a number.',
    example: 'output #(3d6)',
  },
  {
    syntax: 'd',
    meaning: 'Creates a die or a collection of dice.',
    example: 'output 4d6',
  },
];

const functions: FunctionRow[] = [
  { syntax: 'absolute NUMBER', meaning: 'Absolute value.' },
  {
    syntax: 'SEQUENCE contains NUMBER',
    meaning: '1 if the number occurs in the sequence, otherwise 0.',
  },
  {
    syntax: 'count VALUES in SEQUENCE',
    meaning: 'Counts occurrences; repeated values are counted repeatedly.',
  },
  {
    syntax: 'explode DIE',
    meaning: 'Keeps rolling when the maximum value is rolled.',
  },
  {
    syntax: 'highest N of DICE',
    meaning: 'Sum of the highest N values. Supports multiple pools with and.',
  },
  {
    syntax: 'lowest N of DICE',
    meaning: 'Sum of the lowest N values. Supports multiple pools with and.',
  },
  { syntax: 'middle N of DICE', meaning: 'Sum of the middle N values.' },
  {
    syntax: 'highest of A and B',
    meaning: 'Higher of two numbers; dice are expanded per outcome.',
  },
  {
    syntax: 'lowest of A and B',
    meaning: 'Lower of two numbers; dice are expanded per outcome.',
  },
  {
    syntax: 'maximum of DIE',
    meaning: 'Highest possible value on a die (0 for an empty die).',
  },
  { syntax: 'reverse SEQUENCE', meaning: 'Reverses the sequence order.' },
  {
    syntax: 'sort SEQUENCE',
    meaning: 'Sorts using the position order setting.',
  },
];

const examples: Example[] = [
  {
    title: '4d6 drop lowest',
    code: `output [highest 3 of 4d6] named "4d6 drop lowest"

ABILITIES: 6 d [highest 3 of 4d6]
loop P over {1..6} {
  output P @ ABILITIES named "Ability [P]"
}`,
  },
  {
    title: 'Blades in the Dark',
    code: `function: blades ROLL:s {
  if 1@ROLL = 6 {
    result: 2 + (2@ROLL = 6)
  }
  result: 1@ROLL >= 4
}

output [blades 2d6] named "0d"
loop P over {1..7} {
  output [blades Pd6] named "[P]d"
}`,
  },
  {
    title: 'Exploding dice',
    code: `set "explode depth" to 3
output [explode d6] named "one exploding d6"
output 2d[explode d6] named "two independent exploding dice"`,
  },
  {
    title: 'Functions and type casting',
    code: `function: double N:n if above B:n {
  if N > B { result: N + N }
  result: N
}

output [double d6 if above 3] named "1, 2, 3, 8, 10, 12"

function: ROLL:s count fives and above and subtract ones {
  result: (ROLL >= 5) - (ROLL = 1)
}

output [3d6 count fives and above and subtract ones]`,
  },
];
</script>

<template>
  <div class="q-pa-md syntax-doc-page">
    <div class="row items-center q-gutter-sm q-mb-md">
      <QBtn
        flat
        round
        aria-label="Back to calculator"
        @click="router.push('/probability-calculator')"
      >
        <IconArrowLeft />
      </QBtn>
      <IconBook2 :size="28" class="text-primary" />
      <div>
        <div class="text-h5">AnyDice Syntax Reference</div>
        <div class="text-caption text-grey-7">
          Supported syntax for the dice probability calculator
        </div>
      </div>
    </div>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          Program basics
        </div>
        <p>
          A program is a sequence of statements. Variables are uppercase words
          and are assigned with <code>:</code>. Use <code>output</code> to add a
          result and <code>named</code> to give it a title.
        </p>
        <pre v-pre class="syntax-code">
X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"</pre
        >
        <ul class="q-mt-sm">
          <li>Comments use backslashes: <code>\ this is ignored \</code></li>
          <li>Variables can be reassigned and are evaluated in order.</li>
          <li><code>0</code> is false; any non-zero number is true.</li>
        </ul>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          Numbers, dice and operators
        </div>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>Syntax</th>
              <th>Meaning</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="operator in operators" :key="operator.syntax">
              <td>
                <code>{{ operator.syntax }}</code>
              </td>
              <td>{{ operator.meaning }}</td>
              <td>
                <code>{{ operator.example }}</code>
              </td>
            </tr>
          </tbody>
        </QMarkupTable>
        <p class="q-mt-md q-mb-xs">
          <code>d6</code> is one six-sided die, <code>3d6</code> is a collection
          of three dice that are summed, and <code>d%</code> is a d100. Custom
          dice use a sequence: <code>d{1,2,4,4}</code>. Any expression can
          provide the faces: <code>2d(1d4)</code>.
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Sequences</div>
        <p>
          Sequences are written with braces. They preserve their written order;
          use <code>sort</code> when you want the position-order setting
          applied. Mathematical and boolean operations sum all elements of a
          sequence.
        </p>
        <pre v-pre class="syntax-code">
{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}</pre
        >
        <div class="text-subtitle2 q-mt-md q-mb-xs">Position and length</div>
        <pre v-pre class="syntax-code">
1 @ {2,4,6}    \ 2 \
3 @ {2,4,6}    \ 6 \
{1,3} @ {2,4,6} \ 8 \
# {2,4,6}      \ 3 \
1 @ 246        \ 2 \
# (3d6)        \ 3 \</pre
        >
        <p class="q-mb-none">
          <code>set "position order" to "lowest first"</code> reverses dice
          positions and digit positions. It does not reorder sequence literals
          until <code>sort</code> is used.
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          Loops and conditionals
        </div>
        <pre v-pre class="syntax-code">
loop N over {1..4} {
  output Nd4 named "[N]d4"
}

X: 1
if X = 1 {
  output 1
}
else {
  output 1d6
}</pre
        >
        <p class="q-mb-none">
          Conditions can use comparisons and boolean operators. A die cannot be
          used directly as an <code>if</code> condition; pass it to a function
          with a typed parameter when you need to expand it.
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Functions</div>
        <p>
          Function names are made of lowercase words and uppercase parameter
          variables. Invoke a function by putting its name and arguments in
          square brackets. A function returns as soon as <code>result:</code>
          is reached; without a result it returns the empty die.
        </p>
        <pre v-pre class="syntax-code">
function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]</pre
        >
        <p>Parameter types control how values are converted:</p>
        <ul>
          <li>
            <code>:n</code> — numbers. A sequence is summed; a die is expanded
            once per outcome.
          </li>
          <li>
            <code>:d</code> — dice. A number becomes a constant die; a sequence
            is summed and becomes a constant die.
          </li>
          <li>
            <code>:s</code> — sequences. A number becomes a one-element
            sequence; dice are expanded into all possible sorted rolls.
          </li>
        </ul>
        <p class="q-mb-none">
          Functions can recurse. The maximum depth is controlled with
          <code>set "maximum function depth" to N</code>.
          <code>output</code> and <code>set</code> are not allowed inside a
          function.
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          Function library
        </div>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fn in functions" :key="fn.syntax">
              <td>
                <code>[{{ fn.syntax }}]</code>
              </td>
              <td>{{ fn.meaning }}</td>
            </tr>
          </tbody>
        </QMarkupTable>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Settings</div>
        <pre v-pre class="syntax-code">
set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5</pre
        >
        <p class="q-mb-none">
          Settings apply to the statements that follow them. The default
          position order is highest first.
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered>
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Examples</div>
        <div v-for="example in examples" :key="example.title" class="q-mb-lg">
          <div class="text-subtitle2 q-mb-xs">{{ example.title }}</div>
          <pre v-pre class="syntax-code">{{ example.code }}</pre>
        </div>
      </QCardSection>
    </QCard>
  </div>
</template>

<style scoped>
.syntax-doc-page {
  max-width: 1100px;
  margin: 0 auto;
}

.syntax-code {
  margin: 0.5rem 0 1rem;
  padding: 0.85rem 1rem;
  border-radius: 6px;
  background: var(--q-grey-2, #f4f4f4);
  color: var(--q-dark, #1d1d1d);
  font-family: monospace;
  font-size: 13px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre;
}

.syntax-table {
  width: 100%;
}

.syntax-table code {
  white-space: nowrap;
}
</style>
