<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { evaluate, create, all } from 'mathjs';
import { useDragSnap } from '@/composables/useDragSnap';
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

const { t } = useI18n();
const math = create(all);

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const {
  cardStyle,
  transitionHide,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onHide,
} = useDragSnap();

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
  if (!props.modelValue) return;
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

const unitBases = computed(() => [
  { label: t('calculator.unitBases.length'), value: 'length' },
  { label: t('calculator.unitBases.mass'), value: 'mass' },
  { label: t('calculator.unitBases.time'), value: 'time' },
  { label: t('calculator.unitBases.current'), value: 'current' },
  { label: t('calculator.unitBases.temperature'), value: 'temperature' },
  {
    label: t('calculator.unitBases.luminousIntensity'),
    value: 'luminousIntensity',
  },
  {
    label: t('calculator.unitBases.amountOfSubstance'),
    value: 'amountOfSubstance',
  },
  { label: t('calculator.unitBases.force'), value: 'force' },
  { label: t('calculator.unitBases.pressure'), value: 'pressure' },
  { label: t('calculator.unitBases.energy'), value: 'energy' },
  { label: t('calculator.unitBases.power'), value: 'power' },
  { label: t('calculator.unitBases.voltage'), value: 'voltage' },
  { label: t('calculator.unitBases.electricCharge'), value: 'electricCharge' },
  { label: t('calculator.unitBases.capacitance'), value: 'capacitance' },
  { label: t('calculator.unitBases.resistance'), value: 'resistance' },
  { label: t('calculator.unitBases.conductance'), value: 'conductance' },
  { label: t('calculator.unitBases.magneticFlux'), value: 'magneticFlux' },
  {
    label: t('calculator.unitBases.magneticFluxDensity'),
    value: 'magneticFluxDensity',
  },
  { label: t('calculator.unitBases.inductance'), value: 'inductance' },
  { label: t('calculator.unitBases.frequency'), value: 'frequency' },
  { label: t('calculator.unitBases.angle'), value: 'angle' },
  { label: t('calculator.unitBases.area'), value: 'area' },
  { label: t('calculator.unitBases.volume'), value: 'volume' },
  { label: t('calculator.unitBases.speed'), value: 'speed' },
  { label: t('calculator.unitBases.acceleration'), value: 'acceleration' },
  { label: t('calculator.unitBases.density'), value: 'density' },
  { label: t('calculator.unitBases.flow'), value: 'flow' },
  { label: t('calculator.unitBases.illuminance'), value: 'illuminance' },
]);

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

const getUnitOptions = computed(() => (base: string) => {
  const units = unitMap[base] || [];
  return units.map((u) => ({
    label: t(`calculator.unitSymbols.${u}`),
    value: u,
  }));
});

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
  <QDialog
    seamless
    position="bottom"
    class="q-pa-sm"
    v-model="model"
    :transition-hide="transitionHide"
    @hide="onHide"
  >
    <QCard
      :style="[cardStyle, { minWidth: '350px', minHeight: '410px' }]"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <QToolbar
        class="justify-between drag-handle"
        @pointerdown="onPointerDown"
      >
        <QTabs class="q-mb-xs" v-model="tab">
          <QTab name="calculate" :title="t('calculator.calculator')"
            ><IconCalculator
          /></QTab>
          <QTab name="convert" :title="t('calculator.converter')"
            ><IconTransform
          /></QTab>
        </QTabs>

        <QBtn flat clickable @click="model = false"><IconX /></QBtn>
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
              >{{
                result ? t('calculator.equals') + ' ' + result : '\u00A0'
              }}</QCardSection
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
                <QBtn flat class="operation" @click="clear">{{
                  t('calculator.clear')
                }}</QBtn>
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
                    :label="t('calculator.physicalBase')"
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                  />
                </div>
                <div class="col">
                  <QSelect
                    outlined
                    v-if="unitBase"
                    v-model="sourceUnit"
                    :options="getUnitOptions(unitBase)"
                    :label="t('calculator.unit')"
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                  />
                </div>
              </div>

              <QScrollArea style="height: 155px">
                <QList
                  v-if="unitBase && sourceUnit && result !== ''"
                  class="convert-results"
                >
                  <QItem
                    v-for="unit in getUnitOptions(unitBase).filter(
                      (u: { value: string }) => u.value !== sourceUnit,
                    )"
                    :key="unit.value"
                  >
                    <QItemSection side>{{ unit.label }}</QItemSection>
                    <QItemSection class="text-right">{{
                      convertResult(result, sourceUnit, unit.value)
                    }}</QItemSection>
                    <QItemSection side>
                      <QBtn
                        flat
                        size="sm"
                        @click="
                          copyToClipboard(
                            convertResult(result, sourceUnit, unit.value),
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
.drag-handle {
  cursor: grab;
}
</style>
