<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { IconArrowLeft, IconBook2 } from '@tabler/icons-vue';

const router = useRouter();
const { t, tm } = useI18n();

interface OperatorRow {
  syntax: string;
  meaningKey: string;
  example: string;
}

interface FunctionRow {
  syntax: string;
  meaningKey: string;
}

interface Example {
  titleKey: string;
  code: string;
}

const operators: OperatorRow[] = [
  {
    syntax: '+ - * /',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.arithmetic',
    example: 'output 2d6 + 3',
  },
  {
    syntax: '^',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.exponentiation',
    example: 'output 2 ^ 3',
  },
  {
    syntax: '= != < > <= >=',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.comparison',
    example: 'output 3d6 >= 15',
  },
  {
    syntax: '& | !',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.boolean',
    example: 'output 1d6 > 3 & 1d6 != 6',
  },
  {
    syntax: '@',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.access',
    example: 'output 1@3d6',
  },
  {
    syntax: '#',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.length',
    example: 'output #(3d6)',
  },
  {
    syntax: 'd',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.dice',
    example: 'output 4d6',
  },
  {
    syntax: '..',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.range',
    example: '{1..6}',
  },
  {
    syntax: ':',
    meaningKey: 'probabilityCalculator.syntaxPage.operators.colon',
    example: '{1:4}  X: 3',
  },
];

const functions: FunctionRow[] = [
  {
    syntax: 'absolute NUMBER',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.absolute',
  },
  {
    syntax: 'SEQUENCE contains NUMBER',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.contains',
  },
  {
    syntax: 'count VALUES in SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.count',
  },
  {
    syntax: 'explode DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.explode',
  },
  {
    syntax: 'highest N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.highest',
  },
  {
    syntax: 'lowest N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowest',
  },
  {
    syntax: 'middle N of DICE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.middle',
  },
  {
    syntax: 'highest of A and B',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.highestOf',
  },
  {
    syntax: 'lowest of A and B',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowestOf',
  },
  {
    syntax: 'maximum of DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.maximum',
  },
  {
    syntax: 'minimum of DIE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.minimum',
  },
  {
    syntax: 'reverse SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.reverse',
  },
  {
    syntax: 'sort SEQUENCE',
    meaningKey: 'probabilityCalculator.syntaxPage.functionMeanings.sort',
  },
];

const examples: Example[] = [
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.dropLowest',
    code: `output [highest 3 of 4d6] named "4d6 drop lowest"

ABILITIES: 6 d [highest 3 of 4d6]
loop P over {1..6} {
  output P @ ABILITIES named "Ability [P]"
}`,
  },
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.blades',
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
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.exploding',
    code: `set "explode depth" to 3
output [explode d6] named "one exploding d6"
output 2d[explode d6] named "two independent exploding dice"`,
  },
  {
    titleKey: 'probabilityCalculator.syntaxPage.exampleTitles.casting',
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

const basicsBullets = computed(
  () =>
    tm(
      'probabilityCalculator.syntaxPage.basics.bullets',
    ) as unknown as string[],
);

const parameterBullets = computed(
  () =>
    tm(
      'probabilityCalculator.syntaxPage.functions.params',
    ) as unknown as string[],
);
</script>

<template>
  <div class="q-pa-md syntax-doc-page">
    <div class="row items-center q-gutter-sm q-mb-md">
      <QBtn
        flat
        round
        :aria-label="t('probabilityCalculator.syntaxPage.back')"
        @click="router.push('/probability-calculator')"
      >
        <IconArrowLeft />
      </QBtn>
      <div>
        <div class="text-h5">
          {{ t('probabilityCalculator.syntaxPage.title') }}
        </div>
        <div class="text-caption text-grey-7">
          {{ t('probabilityCalculator.syntaxPage.subtitle') }}
        </div>
      </div>
    </div>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.basics') }}
        </div>
        <p>{{ t('probabilityCalculator.syntaxPage.basics.description') }}</p>
        <pre v-pre class="syntax-code">
X: 3
output X + 1 named "four"

DAMAGE: 2d6 + 3
output DAMAGE named "sword damage"</pre
        >
        <ul class="q-mt-sm">
          <li v-for="(bullet, index) in basicsBullets" :key="index">
            {{ bullet }}
          </li>
        </ul>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.operators') }}
        </div>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>{{ t('probabilityCalculator.syntaxPage.table.syntax') }}</th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.meaning') }}</th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.example') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="operator in operators" :key="operator.syntax">
              <td>
                <code>{{ operator.syntax }}</code>
              </td>
              <td>{{ t(operator.meaningKey) }}</td>
              <td>
                <code>{{ operator.example }}</code>
              </td>
            </tr>
          </tbody>
        </QMarkupTable>
        <p class="q-mt-md q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.dice.description') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.sequences') }}
        </div>
        <p>{{ t('probabilityCalculator.syntaxPage.sequences.description') }}</p>
        <pre v-pre class="syntax-code">
{1, 2, 3}
{1..6}
{1:4, 2, 3}
{1..3:2}
{{1,2,4}:2, 5, 6}
{d6}
{}</pre
        >
        <div class="text-subtitle2 q-mt-md q-mb-xs">
          {{ t('probabilityCalculator.syntaxPage.sections.position') }}
        </div>
        <pre v-pre class="syntax-code">
1 @ {2,4,6}    \ 2 \
3 @ {2,4,6}    \ 6 \
{1,3} @ {2,4,6} \ 8 \
# {2,4,6}      \ 3 \
1 @ 246        \ 2 \
# 1234         \ 4 \
# (3d6)        \ 3 \
{1,2} @ 3d6</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.sequences.positionOrder') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.flow') }}
        </div>
        <pre v-pre class="syntax-code">
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
}</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.flow.note') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.functions') }}
        </div>
        <p>{{ t('probabilityCalculator.syntaxPage.functions.description') }}</p>
        <pre v-pre class="syntax-code">
function: add A to B {
  result: A + B
}

output [add 1 to 2]
output [add d4 to d6]</pre
        >
        <p>{{ t('probabilityCalculator.syntaxPage.functions.paramsIntro') }}</p>
        <ul>
          <li v-for="(bullet, index) in parameterBullets" :key="index">
            {{ bullet }}
          </li>
        </ul>
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.functions.recursion') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.library') }}
        </div>
        <QMarkupTable dense flat class="syntax-table">
          <thead>
            <tr>
              <th>
                {{ t('probabilityCalculator.syntaxPage.table.function') }}
              </th>
              <th>{{ t('probabilityCalculator.syntaxPage.table.meaning') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fn in functions" :key="fn.syntax">
              <td>
                <code>[{{ fn.syntax }}]</code>
              </td>
              <td>{{ t(fn.meaningKey) }}</td>
            </tr>
          </tbody>
        </QMarkupTable>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.settings') }}
        </div>
        <pre v-pre class="syntax-code">
set "position order" to "highest first"
set "position order" to "lowest first"
set "explode depth" to 2
set "maximum function depth" to 5</pre
        >
        <p class="q-mb-none">
          {{ t('probabilityCalculator.syntaxPage.settings.note') }}
        </p>
      </QCardSection>
    </QCard>

    <QCard flat bordered>
      <QCardSection>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          {{ t('probabilityCalculator.syntaxPage.sections.examples') }}
        </div>
        <div
          v-for="example in examples"
          :key="example.titleKey"
          class="q-mb-lg"
        >
          <div class="text-subtitle2 q-mb-xs">
            {{ t(example.titleKey) }}
          </div>
          <pre class="syntax-code">{{ example.code }}</pre>
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
