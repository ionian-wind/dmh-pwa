<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Chart, Grid, Line, Responsive, Tooltip } from 'vue3-charts';
import {
  IconBook2,
  IconCheck,
  IconCopy,
  IconDice,
  IconDownload,
  IconPlayerPlay,
  IconChartLine,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconShare,
} from '@tabler/icons-vue';
import MonacoEditor from '@/components/common/MonacoEditor.vue';
import {
  calculate,
  type CalculationResult,
  type OutputResult,
} from '@/utils/dice-probability-calculator';
import {
  registerAnyDiceLanguage,
  ANYDICE_LANGUAGE_ID,
} from './anydiceLanguage';
import { buildShareUrl, sourceFromHash } from './shareLink';
import {
  buildChartData,
  buildExportText,
  buildTransposedTable,
  displayOutcomes,
  formatNumber,
  formatProbability,
  outputLabel,
  rollOutput,
  summarizeOutput,
  type DataMode,
} from './resultUtils';

registerAnyDiceLanguage();

type ViewMode = 'table' | 'graph' | 'export' | 'roller';
type DataModeChoice = DataMode | 'transposed' | 'summary';

const STORAGE_KEY = 'dmh-probability-calculator:source';
const DEFAULT_SOURCE = 'output 3d6';
const { t } = useI18n();
const router = useRouter();

function storedSource(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

const sharedSource = sourceFromHash(window.location.hash);
const source = ref(sharedSource ?? storedSource());
const shareLink = ref(sharedSource === null ? '' : window.location.href);
const result = ref<CalculationResult | null>(null);
const error = ref<string | null>(null);
const isCalculating = ref(false);
const viewMode = ref<ViewMode>('table');
const dataMode = ref<DataModeChoice>('normal');
const copied = ref(false);
const rollerOutputIndex = ref(0);
const rollerAmount = ref(6);
const rollerResults = ref<number[]>([]);
const chartZoom = ref(1);
const MIN_CHART_ZOOM = 0.5;
const MAX_CHART_ZOOM = 3;
const CHART_ZOOM_STEP = 0.25;

watch(source, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in private browsing; calculation still works.
  }
  clearShareLink();
});

const viewOptions: Array<{ value: ViewMode; label: string }> = [
  { value: 'table', label: 'probabilityCalculator.views.table' },
  { value: 'graph', label: 'probabilityCalculator.views.graph' },
  { value: 'export', label: 'probabilityCalculator.views.export' },
  { value: 'roller', label: 'probabilityCalculator.views.roller' },
];

const dataOptions: Array<{
  value: DataModeChoice;
  label: string;
}> = [
  { value: 'normal', label: 'probabilityCalculator.modes.normal' },
  { value: 'atLeast', label: 'probabilityCalculator.modes.atLeast' },
  { value: 'atMost', label: 'probabilityCalculator.modes.atMost' },
  { value: 'transposed', label: 'probabilityCalculator.modes.transposed' },
  { value: 'summary', label: 'probabilityCalculator.modes.summary' },
];

const effectiveDataMode = computed<DataMode>(() =>
  dataMode.value === 'atLeast' || dataMode.value === 'atMost'
    ? dataMode.value
    : 'normal',
);

const outputs = computed(() => result.value?.outputs ?? []);
const chart = computed(() =>
  result.value ? buildChartData(result.value, effectiveDataMode.value) : null,
);
const exportText = computed(() =>
  result.value ? buildExportText(result.value, effectiveDataMode.value) : '',
);
const transposed = computed(() =>
  result.value
    ? buildTransposedTable(result.value, effectiveDataMode.value)
    : null,
);
const summaries = computed(() =>
  outputs.value.map((output, index) => summarizeOutput(output, index)),
);
const rollerOptions = computed(() =>
  outputs.value.map((output, index) => ({
    label: outputLabel(output, index),
    value: index,
  })),
);
const selectedRollerOutput = computed<OutputResult | undefined>(
  () => outputs.value[rollerOutputIndex.value],
);

const showSummary = computed(
  () =>
    dataMode.value === 'summary' &&
    (viewMode.value === 'table' || viewMode.value === 'graph'),
);

const showTransposedTable = computed(
  () =>
    viewMode.value === 'table' &&
    dataMode.value === 'transposed' &&
    !showSummary.value,
);

const showNormalTable = computed(
  () =>
    viewMode.value === 'table' &&
    dataMode.value !== 'transposed' &&
    !showSummary.value,
);

function outcomesFor(output: OutputResult) {
  return displayOutcomes(output, effectiveDataMode.value);
}

async function runCalculation() {
  if (isCalculating.value) return;
  isCalculating.value = true;
  error.value = null;
  await nextTick();
  // Let the loading state paint before the synchronous evaluator runs.
  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    result.value = calculate(source.value);
    rollerOutputIndex.value = 0;
    rollerResults.value = [];
  } catch (caught) {
    result.value = null;
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    isCalculating.value = false;
  }
}

function clearShareLink() {
  shareLink.value = '';
  const url = new URL(window.location.href);
  if (url.hash) {
    url.hash = '';
    history.replaceState(null, '', url.toString());
  }
}

async function createShareLink() {
  const url = buildShareUrl(source.value, window.location.href);
  history.replaceState(null, '', url);
  shareLink.value = url;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Keep the link visible even if clipboard access is unavailable.
  }
}

async function copyExport() {
  try {
    await navigator.clipboard.writeText(exportText.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {
    copied.value = false;
  }
}

function downloadExport() {
  const blob = new Blob([exportText.value], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'anydice-output.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function zoomChart(delta: number) {
  chartZoom.value = Math.min(
    MAX_CHART_ZOOM,
    Math.max(MIN_CHART_ZOOM, chartZoom.value + delta),
  );
}

function resetChartZoom() {
  chartZoom.value = 1;
}

function roll() {
  if (!selectedRollerOutput.value) return;
  rollerResults.value = rollOutput(
    selectedRollerOutput.value,
    Math.max(1, Math.min(100, rollerAmount.value || 1)),
  );
}

watch(rollerOutputIndex, () => {
  rollerResults.value = [];
});

onMounted(() => {
  void runCalculation();
});
</script>

<template>
  <div class="q-pa-md probability-calculator-page">
    <div class="row items-center no-wrap q-gutter-sm q-mb-md">
      <IconChartLine :size="30" class="text-primary" />
      <div class="col">
        <div class="text-h5">{{ t('probabilityCalculator.title') }}</div>
        <div class="text-caption text-grey-7">
          {{ t('probabilityCalculator.subtitle') }}
        </div>
      </div>
      <QBtn flat no-caps @click="router.push('/probability-calculator/syntax')">
        <IconBook2 class="q-mr-xs" :size="18" />
        {{ t('probabilityCalculator.syntax') }}
      </QBtn>
    </div>

    <div class="row items-center no-wrap q-gutter-sm q-mb-md">
      <QInput
        :model-value="shareLink"
        readonly
        outlined
        dense
        class="col share-link-input"
        data-test="share-link-input"
        :aria-label="t('probabilityCalculator.shareLinkLabel')"
        :placeholder="t('probabilityCalculator.clickToCreateLink')"
      />
      <QBtn
        color="primary"
        outline
        round
        data-test="create-share-link"
        :title="t('probabilityCalculator.clickToCreateLink')"
        :aria-label="t('probabilityCalculator.clickToCreateLink')"
        @click="createShareLink"
      >
        <IconShare :size="18" />
      </QBtn>
    </div>

    <QCard flat bordered class="q-mb-md">
      <QCardSection class="q-pb-xs row items-center justify-between">
        <div class="text-subtitle2">
          {{ t('probabilityCalculator.source') }}
        </div>
        <div class="text-caption text-grey-7">
          {{ t('probabilityCalculator.syntaxHint') }}
        </div>
      </QCardSection>
      <QCardSection class="q-pt-xs">
        <MonacoEditor
          v-model="source"
          :language="ANYDICE_LANGUAGE_ID"
          height="340px"
          :options="{
            ariaLabel: t('probabilityCalculator.source'),
            scrollbar: { verticalScrollbarSize: 10 },
          }"
        />
      </QCardSection>
      <QCardSection
        class="q-pt-none row items-center justify-between q-gutter-md"
      >
        <div class="text-caption text-grey-7">
          {{ t('probabilityCalculator.shortcutHint') }}
        </div>
        <QBtn
          color="primary"
          unelevated
          no-caps
          :loading="isCalculating"
          @click="runCalculation"
        >
          <template #loading>
            {{ t('probabilityCalculator.calculating') }}
          </template>
          <template #default>
            <IconPlayerPlay class="q-mr-sm" :size="18" />
            {{ t('probabilityCalculator.calculate') }}
          </template>
        </QBtn>
      </QCardSection>
    </QCard>

    <QCard flat bordered class="q-mb-md">
      <QCardSection class="row wrap items-start q-col-gutter-md">
        <div class="col-auto">
          <div class="text-caption text-grey-7 q-mb-xs">
            {{ t('probabilityCalculator.view') }}
          </div>
          <QBtnGroup>
            <QBtn
              v-for="option in viewOptions"
              :key="option.value"
              no-caps
              size="sm"
              :outline="viewMode !== option.value"
              :color="viewMode === option.value ? 'primary' : 'grey-8'"
              :label="t(option.label)"
              @click="viewMode = option.value"
            />
          </QBtnGroup>
        </div>
        <div class="col-auto">
          <div class="text-caption text-grey-7 q-mb-xs">
            {{ t('probabilityCalculator.data') }}
          </div>
          <QBtnGroup>
            <QBtn
              v-for="option in dataOptions"
              :key="option.value"
              no-caps
              size="sm"
              :outline="dataMode !== option.value"
              :color="dataMode === option.value ? 'primary' : 'grey-8'"
              :label="t(option.label)"
              @click="dataMode = option.value"
            />
          </QBtnGroup>
        </div>
      </QCardSection>
    </QCard>

    <QBanner
      v-if="error"
      class="q-mb-md"
      inline-actions
      rounded
      bg-color="negative"
      text-color="white"
    >
      <template #avatar>
        <span class="text-weight-bold">!</span>
      </template>
      <div>
        <div class="text-weight-medium">
          {{ t('probabilityCalculator.errorTitle') }}
        </div>
        <div class="text-caption">{{ error }}</div>
      </div>
    </QBanner>

    <QCard v-if="isCalculating && !result" flat bordered class="q-pa-xl">
      <div class="flex flex-center text-grey-7">
        <QSpinner class="q-mr-sm" />
        {{ t('probabilityCalculator.calculating') }}
      </div>
    </QCard>

    <QCard v-else-if="!result" flat bordered class="q-pa-xl text-center">
      <div class="text-grey-7">{{ t('probabilityCalculator.empty') }}</div>
    </QCard>

    <template v-else>
      <div v-if="showSummary" class="row q-col-gutter-md">
        <div
          v-for="summary in summaries"
          :key="summary.label"
          class="col-12 col-md-6"
        >
          <QCard flat bordered>
            <QCardSection>
              <div class="text-subtitle1 text-weight-medium q-mb-sm">
                {{ summary.label }}
              </div>
              <div class="summary-grid">
                <span>{{ t('probabilityCalculator.mean') }}</span>
                <strong>{{ formatNumber(summary.mean, 3) }}</strong>
                <span>{{ t('probabilityCalculator.stddev') }}</span>
                <strong>{{ formatNumber(summary.stddev, 3) }}</strong>
                <span>{{ t('probabilityCalculator.min') }}</span>
                <strong>{{ summary.min }}</strong>
                <span>{{ t('probabilityCalculator.max') }}</span>
                <strong>{{ summary.max }}</strong>
                <span>{{ t('probabilityCalculator.outcomes') }}</span>
                <strong>{{ summary.outcomeCount }}</strong>
                <span>{{ t('probabilityCalculator.mostLikely') }}</span>
                <strong>
                  <template v-if="summary.mostLikely">
                    {{ summary.mostLikely.value }}
                    ({{ formatProbability(summary.mostLikely.probability) }})
                  </template>
                  <template v-else>—</template>
                </strong>
              </div>
            </QCardSection>
          </QCard>
        </div>
      </div>

      <QCard v-else-if="viewMode === 'graph'" flat bordered>
        <QCardSection>
          <div class="row items-center justify-end q-gutter-xs q-mb-sm">
            <QBtn
              flat
              dense
              round
              :aria-label="t('probabilityCalculator.zoomOut')"
              :disable="chartZoom <= MIN_CHART_ZOOM"
              @click="zoomChart(-CHART_ZOOM_STEP)"
            >
              <IconZoomOut :size="18" />
            </QBtn>
            <span class="text-caption text-grey-7 zoom-label">
              {{ Math.round(chartZoom * 100) }}%
            </span>
            <QBtn
              flat
              dense
              round
              :aria-label="t('probabilityCalculator.zoomIn')"
              :disable="chartZoom >= MAX_CHART_ZOOM"
              @click="zoomChart(CHART_ZOOM_STEP)"
            >
              <IconZoomIn :size="18" />
            </QBtn>
            <QBtn
              flat
              dense
              round
              :aria-label="t('probabilityCalculator.zoomReset')"
              :disable="chartZoom === 1"
              @click="resetChartZoom"
            >
              <IconZoomReset :size="18" />
            </QBtn>
          </div>
          <div
            v-if="chart && chart.rows.length"
            class="probability-chart-wrapper"
          >
            <Responsive
              class="probability-chart-responsive"
              :style="{
                height: `${Math.round(440 * chartZoom)}px`,
              }"
            >
              <template #main="{ width, height }">
                <Chart
                  :data="chart.rows"
                  :size="{
                    width: Math.round(width * chartZoom),
                    height: Math.round(height),
                  }"
                  :margin="{ top: 20, right: 24, bottom: 36, left: 56 }"
                  :axis="{
                    primary: {
                      format: (value: unknown) => String(Number(value)),
                    },
                    secondary: {
                      format: (value: unknown) =>
                        formatProbability(Number(value), 0),
                    },
                  }"
                >
                  <template #layers>
                    <Grid strokeDasharray="2,2" />
                    <Line
                      v-for="series in chart.series"
                      :key="series.key"
                      :data-keys="['value', series.key]"
                      :line-style="{ stroke: series.color, strokeWidth: 2 }"
                      :dot-style="{ fill: series.color }"
                      :hide-dot="chart.rows.length > 40"
                    />
                    <Tooltip />
                  </template>
                </Chart>
              </template>
            </Responsive>
          </div>
          <div v-else class="text-grey-7">
            {{ t('probabilityCalculator.noOutcomes') }}
          </div>
          <div class="row q-gutter-md q-mt-sm">
            <div
              v-for="series in chart?.series ?? []"
              :key="series.key"
              class="row items-center q-gutter-xs text-caption"
            >
              <span
                class="chart-legend-swatch"
                :style="{ backgroundColor: series.color }"
              ></span>
              {{ series.label }}
            </div>
          </div>
        </QCardSection>
      </QCard>

      <QCard v-else-if="viewMode === 'export'" flat bordered>
        <QCardSection class="row items-center justify-between">
          <div class="text-subtitle2">
            {{ t('probabilityCalculator.exportTitle') }}
          </div>
          <div class="row q-gutter-sm">
            <QBtn flat dense no-caps @click="copyExport">
              <IconCheck v-if="copied" class="q-mr-xs" :size="18" />
              <IconCopy v-else class="q-mr-xs" :size="18" />
              {{
                copied
                  ? t('probabilityCalculator.copied')
                  : t('probabilityCalculator.copy')
              }}
            </QBtn>
            <QBtn flat dense no-caps @click="downloadExport">
              <IconDownload class="q-mr-xs" :size="18" />
              {{ t('probabilityCalculator.download') }}
            </QBtn>
          </div>
        </QCardSection>
        <QCardSection class="q-pt-none">
          <QInput
            :model-value="exportText"
            type="textarea"
            readonly
            outlined
            data-test="export-output"
            input-class="probability-export-text"
            :input-style="{ minHeight: '260px' }"
          />
        </QCardSection>
      </QCard>

      <QCard v-else-if="viewMode === 'roller'" flat bordered>
        <QCardSection class="row items-end q-col-gutter-md">
          <div class="col-12 col-sm-5">
            <QSelect
              v-model="rollerOutputIndex"
              outlined
              dense
              emit-value
              map-options
              :options="rollerOptions"
              :label="t('probabilityCalculator.rollerOutput')"
            />
          </div>
          <div class="col-auto">
            <QInput
              v-model.number="rollerAmount"
              outlined
              dense
              type="number"
              min="1"
              max="100"
              :label="t('probabilityCalculator.rollAmount')"
            />
          </div>
          <div class="col-auto">
            <QBtn color="primary" unelevated no-caps @click="roll">
              <IconDice class="q-mr-xs" :size="18" />
              {{ t('probabilityCalculator.roll') }}
            </QBtn>
          </div>
        </QCardSection>
        <QCardSection class="q-pt-none">
          <div v-if="rollerResults.length" class="roller-results">
            <span
              v-for="(value, index) in rollerResults"
              :key="index"
              class="roller-result"
            >
              {{ value }}
            </span>
          </div>
          <div v-else class="text-grey-7">
            {{ t('probabilityCalculator.rollHint') }}
          </div>
        </QCardSection>
      </QCard>

      <template v-else-if="showTransposedTable && transposed">
        <QCard flat bordered>
          <QCardSection>
            <QMarkupTable dense flat bordered class="probability-table">
              <thead>
                <tr>
                  <th>{{ t('probabilityCalculator.value') }}</th>
                  <th v-for="column in transposed.columns" :key="column">
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in transposed.rows" :key="row.value">
                  <td>{{ row.value }}</td>
                  <td
                    v-for="(probability, index) in row.probabilities"
                    :key="index"
                  >
                    {{ probability ? formatProbability(probability) : '—' }}
                  </td>
                </tr>
              </tbody>
            </QMarkupTable>
          </QCardSection>
        </QCard>
      </template>

      <template v-else-if="showNormalTable">
        <QCard
          v-for="(output, outputIndex) in outputs"
          :key="outputIndex"
          flat
          bordered
          class="q-mb-md"
        >
          <QCardSection class="q-pb-xs">
            <div class="row items-baseline justify-between">
              <div class="text-subtitle1 text-weight-medium">
                {{ outputLabel(output, outputIndex) }}
              </div>
              <div class="text-caption text-grey-7">
                {{ t('probabilityCalculator.mean') }}
                {{ formatNumber(output.mean, 3) }} ·
                {{ t('probabilityCalculator.stddev') }}
                {{ formatNumber(output.stddev, 3) }}
              </div>
            </div>
          </QCardSection>
          <QCardSection class="q-pt-xs">
            <QMarkupTable dense flat class="probability-table">
              <thead>
                <tr>
                  <th>{{ t('probabilityCalculator.value') }}</th>
                  <th>{{ t('probabilityCalculator.probability') }}</th>
                  <th class="probability-bar-column"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="outcome in outcomesFor(output)" :key="outcome.value">
                  <td>{{ outcome.value }}</td>
                  <td>{{ formatProbability(outcome.probability) }}</td>
                  <td class="probability-bar-column">
                    <div class="probability-bar-track">
                      <div
                        class="probability-bar-fill"
                        :style="{
                          width: `${Math.min(100, outcome.probability * 100)}%`,
                        }"
                      ></div>
                    </div>
                  </td>
                </tr>
                <tr v-if="output.outcomes.length === 0">
                  <td colspan="3" class="text-grey-7">
                    {{ t('probabilityCalculator.noOutcomes') }}
                  </td>
                </tr>
              </tbody>
            </QMarkupTable>
          </QCardSection>
        </QCard>
      </template>
    </template>
  </div>
</template>

<style scoped>
.probability-calculator-page {
  max-width: 1280px;
  margin: 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.35rem 1rem;
}

.summary-grid span {
  color: var(--q-grey-7, #666);
}

.probability-chart-responsive {
  width: 100%;
  height: 440px;
}

.probability-chart-wrapper {
  min-height: 440px;
  max-height: 680px;
  overflow: auto;
}

.zoom-label {
  min-width: 3.5rem;
  text-align: center;
}

.chart-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.probability-table {
  width: 100%;
}

.probability-bar-column {
  width: 45%;
}

.probability-bar-track {
  height: 9px;
  border-radius: 999px;
  background: var(--q-grey-3, #e0e0e0);
  overflow: hidden;
}

.probability-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--q-primary, #3f51b5);
}

.roller-results {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.roller-result {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.6rem;
  border-radius: 999px;
  background: var(--q-primary, #3f51b5);
  color: white;
  font-weight: 600;
}

.probability-export-text {
  font-family: monospace;
  font-size: 12px;
}
</style>
