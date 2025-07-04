<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { evaluate, create, all } from 'mathjs';
import {
  IconTransform,
  IconCalculator,
  IconParentheses,
  IconPercentage,
  IconDivide,
  IconX,
  IconMinus,
  IconPlus,
  IconBackspace,
  IconEqual,
  IconCopy,
} from '@tabler/icons-vue';

const math = create(all);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const input = ref('');
const result = ref('');
const error = ref('');

const replaceMap = new Map([
  ['/', '÷'],
  ['*', '×'],
]);

function append(val: string) {
  error.value = '';
  input.value += replaceMap.get(val) ?? val;
}

function applyInputAliases(exprRaw: string): string {
  let expr = exprRaw;

  replaceMap.forEach((alias, target) => {
    expr = expr.split(alias).join(target);
  });

  return expr;
}

function clear() {
  input.value = '';
  result.value = '';
  error.value = '';
}

function calculate() {
  try {
    // Apply symbol aliases for math.js compatibility
    const expr = applyInputAliases(input.value || '0');
    console.log(expr);
    result.value = String(evaluate(expr));
    error.value = '';
  } catch (e: any) {
    result.value = '';
    error.value = e.message || 'Error';
  }
}

function handleKey(e: KeyboardEvent) {
  if (e.key.match(/^[0-9\+\-\*\/\.\(\)]$/)) {
    e.preventDefault();
    append(e.key);
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    calculate();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    input.value = input.value.slice(0, -1);
  } else if (e.key.toLowerCase() === 'c') {
    e.preventDefault();
    clear();
  }
}

function appendBrace() {
  const trimmed = input.value.trim();
  const lastChar = trimmed[trimmed.length - 1];
  if (['+', '-', '*', '/'].includes(lastChar)) {
    append('(');
    return;
  }
  const open = (input.value.match(/\(/g) || []).length;
  const close = (input.value.match(/\)/g) || []).length;
  if (open <= close) {
    append('(');
  } else {
    append(')');
  }
}

function backspace() {
  input.value = input.value.slice(0, -1);
}

const tab = ref<'calculate' | 'convert'>('calculate');

watch(tab, (value) => {
  if (value === 'convert') {
    calculate();
  }
});

const unitBases = [
  { label: 'Length', value: 'length' },
  { label: 'Mass', value: 'mass' },
  { label: 'Time', value: 'time' },
  { label: 'Current', value: 'current' },
  { label: 'Temperature', value: 'temperature' },
  { label: 'Luminous Intensity', value: 'luminousIntensity' },
  { label: 'Amount of Substance', value: 'amountOfSubstance' },
  { label: 'Force', value: 'force' },
  { label: 'Pressure', value: 'pressure' },
  { label: 'Energy', value: 'energy' },
  { label: 'Power', value: 'power' },
  { label: 'Voltage', value: 'voltage' },
  { label: 'Electric Charge', value: 'electricCharge' },
  { label: 'Capacitance', value: 'capacitance' },
  { label: 'Resistance', value: 'resistance' },
  { label: 'Conductance', value: 'conductance' },
  { label: 'Magnetic Flux', value: 'magneticFlux' },
  { label: 'Magnetic Flux Density', value: 'magneticFluxDensity' },
  { label: 'Inductance', value: 'inductance' },
  { label: 'Frequency', value: 'frequency' },
  { label: 'Angle', value: 'angle' },
  { label: 'Area', value: 'area' },
  { label: 'Volume', value: 'volume' },
  { label: 'Speed', value: 'speed' },
  { label: 'Acceleration', value: 'acceleration' },
  { label: 'Density', value: 'density' },
  { label: 'Flow', value: 'flow' },
  { label: 'Illuminance', value: 'illuminance' },
];

const unitMap: Record<string, string[]> = {
  length: ['m', 'cm', 'mm', 'km', 'in', 'ft', 'yd', 'mi'],
  mass: ['kg', 'g', 'mg', 'lb', 'oz'],
  time: ['s', 'min', 'h', 'day', 'week'],
  current: ['A', 'mA'],
  temperature: ['K', 'degC', 'degF'],
  luminousIntensity: ['cd'],
  amountOfSubstance: ['mol'],
  force: ['N', 'lbf'],
  pressure: ['Pa', 'bar', 'psi', 'atm'],
  energy: ['J', 'kJ', 'cal', 'Wh', 'kWh'],
  power: ['W', 'kW', 'MW', 'hp'],
  voltage: ['V', 'kV'],
  electricCharge: ['C', 'mC'],
  capacitance: ['F', 'mF', 'uF'],
  resistance: ['ohm', 'kOhm'],
  conductance: ['S'],
  magneticFlux: ['Wb'],
  magneticFluxDensity: ['T', 'G'],
  inductance: ['H'],
  frequency: ['Hz', 'kHz', 'MHz'],
  angle: ['rad', 'deg', 'grad'],
  area: ['m2', 'cm2', 'mm2', 'km2', 'ft2', 'in2'],
  volume: ['m3', 'cm3', 'mm3', 'l', 'ml', 'ft3', 'in3'],
  speed: ['m/s', 'km/h', 'mi/h'],
  acceleration: ['m/s2'],
  density: ['kg/m3', 'g/cm3'],
  flow: ['m3/s', 'l/min'],
  illuminance: ['lx'],
};

const unitBase = ref('');
const sourceUnit = ref('');

function convertResult(val: string, from: string, to: string): string | number {
  try {
    const n = Number(val);
    if (isNaN(n)) return '';
    return math.unit(n, from).toNumber(to);
  } catch {
    return '';
  }
}

function copyToClipboard(val: string | number): void {
  navigator.clipboard.writeText(String(val));
}

watch(unitBase, () => {
  sourceUnit.value = '';
});

onMounted(() => window.addEventListener('keydown', handleKey));
onUnmounted(() => {
  window.removeEventListener('keydown', handleKey);

  unitBase.value = '';
  sourceUnit.value = '';
  tab.value = 'calculate';
  clear();
});
</script>

<template>
  <QDialog seamless position="bottom" class="q-pa-sm">
    <QCard style="min-width: 350px; min-height: 410px">
      <QToolbar class="justify-between">
        <QTabs class="q-mb-xs" v-model="tab">
          <QTab name="calculate" title="Calculator"><IconCalculator /></QTab>
          <QTab name="convert" title="Converter"><IconTransform /></QTab>
        </QTabs>

        <QBtn flat clickable @click="emit('update:modelValue', false)"
          ><IconX
        /></QBtn>
      </QToolbar>
      <QCardSection>
        <div class="calculator-view">
          <QCard flat class="q-pa-xs q-mb-sm bg-secondary">
            <QCardSection class="calculator-input q-pa-sm">{{
              input || '0'
            }}</QCardSection>
            <QCardSection
              class="calculator-result q-pa-sm text-positive"
              aria-live="polite"
              >{{ result ? '= ' + result : '\u00A0' }}</QCardSection
            >
            <QCardSection
              class="calculator-error q-pa-sm text-negative"
              v-if="error"
              >{{ error }}</QCardSection
            >
          </QCard>

          <QTabPanels v-model="tab" animated>
            <QTabPanel name="calculate" class="q-pa-none">
              <div class="calculator-buttons justify-evenly">
                <QBtn flat class="operation" @click="clear">AC</QBtn>
                <QBtn flat class="operation" @click="appendBrace"
                  ><IconParentheses
                /></QBtn>
                <QBtn flat class="operation" @click="append('%')"
                  ><IconPercentage
                /></QBtn>
                <QBtn flat class="operation" @click="append('÷')"
                  ><IconDivide
                /></QBtn>

                <QBtn flat @click="append('7')">7</QBtn>
                <QBtn flat @click="append('8')">8</QBtn>
                <QBtn flat @click="append('9')">9</QBtn>
                <QBtn flat class="operation" @click="append('×')"
                  ><IconX />
                </QBtn>

                <QBtn flat @click="append('4')">4</QBtn>
                <QBtn flat @click="append('5')">5</QBtn>
                <QBtn flat @click="append('6')">6</QBtn>
                <QBtn flat class="operation" @click="append('-')"
                  ><IconMinus
                /></QBtn>

                <QBtn flat @click="append('1')">1</QBtn>
                <QBtn flat @click="append('2')">2</QBtn>
                <QBtn flat @click="append('3')">3</QBtn>
                <QBtn flat class="operation" @click="append('+')"
                  ><IconPlus
                /></QBtn>

                <QBtn flat @click="append('0')">0</QBtn>
                <QBtn flat @click="append('.')">.</QBtn>

                <QBtn flat class="control" @click="backspace"
                  ><IconBackspace
                /></QBtn>
                <QBtn flat class="control" @click="calculate"
                  ><IconEqual
                /></QBtn>
              </div>
            </QTabPanel>
            <QTabPanel name="convert" class="q-pa-none">
              <div class="q-gutter-xs justify-around q-mb-sm row">
                <div class="col">
                  <QSelect
                    outlined
                    v-model="unitBase"
                    :options="unitBases"
                    label="Physical base"
                    emit-value
                  />
                </div>
                <div class="col">
                  <QSelect
                    outlined
                    v-if="unitBase"
                    v-model="sourceUnit"
                    :options="unitMap[unitBase] || []"
                    label="Unit"
                  />
                </div>
              </div>

              <QScrollArea style="height: 155px">
                <QList
                  v-if="unitBase && sourceUnit && result !== ''"
                  class="convert-results"
                >
                  <QItem
                    v-for="unit in unitMap[unitBase]?.filter(
                      (u: string) => u !== sourceUnit,
                    )"
                    :key="unit"
                  >
                    <QItemSection side>{{ unit }}</QItemSection>
                    <QItemSection>{{
                      convertResult(result, sourceUnit, unit)
                    }}</QItemSection>
                    <QItemSection side>
                      <QBtn
                        flat
                        size="sm"
                        @click="
                          copyToClipboard(
                            convertResult(result, sourceUnit, unit),
                          )
                        "
                      >
                        <IconCopy />
                      </QBtn>
                    </QItemSection>
                  </QItem>
                </QList>
              </QScrollArea>
            </QTabPanel>
          </QTabPanels>
        </div>
      </QCardSection>
    </QCard>
  </QDialog>
</template>

<style scoped>
.calculator-input {
  font-size: 1.3rem;
  word-break: break-all;
}
.calculator-result {
  font-size: 1.1rem;
}
.calculator-error {
  font-size: 1.1rem;
  color: var(--color-danger);
  margin-top: 0.2rem;
}
.calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 60px);
  gap: 0.5rem;
}
.operation {
  background-color: var(--color-info-light);
}
.control {
  background-color: var(--color-misc-light);
}
</style>
