<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { Chart, Grid, Line, Responsive, Tooltip } from 'vue3-charts';
import {
  IconHelpCircle,
  IconCheck,
  IconCopy,
  IconDice,
  IconDownload,
  IconPlayerPlay,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconShare,
  IconDeviceFloppy,
  IconCodeblock,
} from '@tabler/icons-vue';
import MonacoEditor from '@/components/common/MonacoEditor.vue';
import { monaco } from '@/components/common/monaco';
import ViewHeader from '@/components/common/ViewHeader.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { confirm, prompt } from '@/dialogs';
import {
  calculate,
  DiceSyntaxError,
  type CalculationResult,
  type OutputResult,
} from '@/utils/dice-probability-calculator';
import {
  registerAnyDiceLanguage,
  ANYDICE_LANGUAGE_ID,
} from './anydiceLanguage';
import { buildShareUrl, sourceFromHash } from './shareLink';
import { formatDiceSyntaxError } from './syntaxErrors';
import {
  setAnyDiceCompletionCodePieces,
  setAnyDiceCompletionTranslator,
} from './anydiceCompletions';
import CodeLibraryPanel from './CodeLibraryPanel.vue';
import {
  createCodePiece,
  loadCodeLibrary,
  saveCodeLibrary,
  type CodeLibraryPanelState,
  type CodePiece,
} from './codeLibrary';
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
setAnyDiceCompletionTranslator((key, named) => t(key, named as any));

function storedSource(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

const sharedSource = sourceFromHash(window.location.hash);
const source = ref(sharedSource ?? storedSource());
const cleanSource = ref(source.value);
const shareLink = ref(sharedSource === null ? '' : window.location.href);
const libraryState = reactive<CodeLibraryPanelState>({
  pieces: loadCodeLibrary(),
  selectedId: null,
  onLoad: () => undefined,
  onRename: () => undefined,
  onDelete: () => undefined,
});
const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null);
const MARKER_OWNER = 'probability-calculator';
const result = ref<CalculationResult | null>(null);
const error = ref<string | null>(null);
const syntaxError = ref<DiceSyntaxError | null>(null);
const errorMessage = computed(() =>
  syntaxError.value
    ? formatDiceSyntaxError(syntaxError.value, t)
    : (error.value ?? ''),
);
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

watch(
  () => libraryState.pieces,
  (pieces) => {
    saveCodeLibrary(pieces);
  },
  { deep: true },
);

watch(
  () => libraryState.pieces,
  (pieces) => setAnyDiceCompletionCodePieces(pieces),
  { deep: true, immediate: true },
);

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

const selectedLibraryCode = computed(() =>
  libraryState.pieces
    .filter((piece) => piece.include && piece.code.trim())
    .map((piece) => piece.code),
);
const effectiveSource = computed(() =>
  [...selectedLibraryCode.value, source.value]
    .filter((code) => code.trim())
    .join('\n\n'),
);
const isSourceDirty = computed(() => source.value !== cleanSource.value);

watch(selectedLibraryCode, () => {
  result.value = null;
  error.value = null;
  syntaxError.value = null;
});

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

function clearSyntaxMarkers() {
  const model = editorRef.value?.getEditor()?.getModel();
  if (model) monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
}

function markSyntaxError(caught: DiceSyntaxError) {
  const model = editorRef.value?.getEditor()?.getModel();
  if (!model) return;
  monaco.editor.setModelMarkers(model, MARKER_OWNER, [
    {
      startLineNumber: caught.line,
      startColumn: caught.column,
      endLineNumber: caught.endLine,
      endColumn: caught.endColumn,
      message: `${formatDiceSyntaxError(caught, t)} (${t(
        'probabilityCalculator.syntaxErrors.location',
        { line: caught.line, column: caught.column },
      )})`,
      severity: monaco.MarkerSeverity.Error,
    },
  ]);
}

async function runCalculation() {
  if (isCalculating.value) return;
  isCalculating.value = true;
  error.value = null;
  syntaxError.value = null;
  clearSyntaxMarkers();
  await nextTick();
  // Let the loading state paint before the synchronous evaluator runs.
  await new Promise((resolve) => setTimeout(resolve, 0));

  try {
    result.value = calculate(effectiveSource.value);
    rollerOutputIndex.value = 0;
    rollerResults.value = [];
  } catch (caught) {
    result.value = null;
    if (caught instanceof DiceSyntaxError) {
      syntaxError.value = caught;
      markSyntaxError(caught);
    }
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    isCalculating.value = false;
  }
}

function focusSyntaxError() {
  const caught = syntaxError.value;
  if (!caught) return;
  const editor = editorRef.value?.getEditor();
  if (!editor) return;
  editor.revealLineInCenter(caught.line);
  editor.setPosition({ lineNumber: caught.line, column: caught.column });
  editor.focus();
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

async function saveCodePiece() {
  const name = await prompt(t('probabilityCalculator.library.namePrompt'), {
    title: t('probabilityCalculator.library.saveTitle'),
  });
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const piece = createCodePiece(trimmed, source.value);
  libraryState.pieces.push(piece);
  libraryState.selectedId = piece.id;
  cleanSource.value = source.value;
}

async function renameCodePiece(piece: CodePiece) {
  const name = await prompt(t('probabilityCalculator.library.editPrompt'), {
    title: t('probabilityCalculator.library.editTitle'),
    modelValue: piece.name,
  });
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  piece.name = trimmed;
}

async function deleteCodePiece(piece: CodePiece) {
  const confirmed = await confirm(
    t('probabilityCalculator.library.deleteConfirm', { name: piece.name }),
    { title: t('probabilityCalculator.library.deleteTitle') },
  );
  if (!confirmed) return;

  const index = libraryState.pieces.findIndex((entry) => entry.id === piece.id);
  if (index >= 0) libraryState.pieces.splice(index, 1);
  if (libraryState.selectedId === piece.id) libraryState.selectedId = null;
}

async function loadCodePiece(piece: CodePiece) {
  if (isSourceDirty.value) {
    const confirmed = await confirm(
      t('probabilityCalculator.library.replaceConfirm', { name: piece.name }),
      { title: t('probabilityCalculator.library.loadTitle') },
    );
    if (!confirmed) return;
  }

  source.value = piece.code;
  cleanSource.value = piece.code;
  libraryState.selectedId = piece.id;
  result.value = null;
  error.value = null;
  syntaxError.value = null;
  rollerResults.value = [];
  clearShareLink();
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

libraryState.onLoad = loadCodePiece;
libraryState.onRename = renameCodePiece;
libraryState.onDelete = deleteCodePiece;

onBeforeRouteLeave(async () => {
  if (!isSourceDirty.value) return true;
  return confirm(t('probabilityCalculator.library.leaveConfirm'), {
    title: t('probabilityCalculator.library.unsavedTitle'),
  });
});

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isSourceDirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

const layout = useLayout();
const rightDrawer = useRightDrawer();

onMounted(() => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: {
      title: t('probabilityCalculator.title'),
      rightDrawerIcon: IconCodeblock,
      buttons: [
        {
          icon: IconHelpCircle,
          color: 'primary',
          title: 'probabilityCalculator.syntax',
          event: () => router.push('/probability-calculator/syntax'),
        },
      ],
    },
  });
  rightDrawer.set({
    component: CodeLibraryPanel,
    props: { state: libraryState },
  });
  window.addEventListener('beforeunload', handleBeforeUnload);
  void runCalculation();
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  setAnyDiceCompletionCodePieces([]);
  setAnyDiceCompletionTranslator(null);
  layout.setTopMenuContent(null);
  rightDrawer.clear();
});
</script>

<template>
  <div class="q-pa-md probability-calculator-page">
    <div class="row items-center no-wrap q-gutter-sm q-mb-lg">
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
        flat
        no-caps
        data-test="create-share-link"
        :title="t('probabilityCalculator.clickToCreateLink')"
        :aria-label="t('probabilityCalculator.clickToCreateLink')"
        @click="createShareLink"
      >
        <IconShare :size="18" />
      </QBtn>
    </div>

    <section class="q-mb-lg">
      <div class="row items-center justify-between q-mb-xs">
        <div class="text-subtitle2">
          {{ t('probabilityCalculator.source') }}
        </div>
        <div class="text-caption text-grey-7">
          {{ t('probabilityCalculator.syntaxHint') }}
        </div>
      </div>
      <MonacoEditor
        ref="editorRef"
        v-model="source"
        :language="ANYDICE_LANGUAGE_ID"
        height="340px"
        :options="{
          ariaLabel: t('probabilityCalculator.source'),
          scrollbar: { verticalScrollbarSize: 10 },
        }"
      />
      <div class="row items-center justify-between q-gutter-md q-mt-sm">
        <div class="row items-center q-gutter-sm">
          <QBtn flat no-caps @click="saveCodePiece">
            <IconDeviceFloppy class="q-mr-xs" :size="18" />
            {{ t('probabilityCalculator.save') }}
          </QBtn>
        </div>
        <QBtn
          color="positive"
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
      </div>
    </section>

    <section class="row wrap items-start q-col-gutter-md q-mb-md">
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
    </section>

    <QBanner
      v-if="errorMessage"
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
        <div class="text-caption">
          {{ errorMessage }}
          <template v-if="syntaxError">
            ·
            <button
              type="button"
              class="syntax-error-location"
              @click="focusSyntaxError"
            >
              {{
                t('probabilityCalculator.syntaxErrors.location', {
                  line: syntaxError.line,
                  column: syntaxError.column,
                })
              }}
            </button>
          </template>
        </div>
      </div>
    </QBanner>

    <div
      v-if="isCalculating && !result"
      class="q-pa-lg text-grey-7 flex flex-center"
    >
      <QSpinner class="q-mr-sm" />
      {{ t('probabilityCalculator.calculating') }}
    </div>

    <div v-else-if="!result" class="q-pa-lg text-center text-grey-7">
      {{ t('probabilityCalculator.empty') }}
    </div>

    <template v-else>
      <div v-if="showSummary" class="row q-col-gutter-md">
        <div
          v-for="summary in summaries"
          :key="summary.label"
          class="col-12 col-md-6"
        >
          <div class="summary-block q-pa-sm">
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
          </div>
        </div>
      </div>

      <section v-else-if="viewMode === 'graph'" class="q-mb-md">
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
            :style="{ height: `${Math.round(440 * chartZoom)}px` }"
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
      </section>

      <section v-else-if="viewMode === 'export'" class="q-mb-md">
        <div class="row items-center justify-between q-mb-sm">
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
        </div>
        <QInput
          :model-value="exportText"
          type="textarea"
          readonly
          outlined
          data-test="export-output"
          input-class="probability-export-text"
          :input-style="{ minHeight: '260px' }"
        />
      </section>

      <section v-else-if="viewMode === 'roller'" class="q-mb-md">
        <div class="row items-end q-col-gutter-md">
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
        </div>
        <div class="q-mt-md">
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
        </div>
      </section>

      <template v-else-if="showTransposedTable && transposed">
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
      </template>

      <template v-else-if="showNormalTable">
        <section
          v-for="(output, outputIndex) in outputs"
          :key="outputIndex"
          class="q-mb-lg"
        >
          <div class="row items-baseline justify-between q-mb-xs">
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
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.probability-calculator-page {
  max-width: 1280px;
  margin: 0 auto;
}

.probability-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: 16px;
}

.probability-main {
  min-width: 0;
}

.probability-sidebar {
  position: sticky;
  top: 16px;
}

.code-library-card {
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.code-library-list {
  overflow-y: auto;
}

.code-library-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 4px 6px 2px;
  border-radius: 6px;
  cursor: pointer;
}

.code-library-item:hover {
  background: var(--q-grey-2, #f5f5f5);
}

.code-library-item.is-selected {
  background: color-mix(in srgb, var(--q-primary, #3f51b5) 12%, transparent);
}

.code-library-checkbox {
  flex: none;
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 1023px) {
  .probability-layout {
    grid-template-columns: 1fr;
  }

  .probability-sidebar {
    position: static;
  }

  .code-library-card {
    max-height: none;
  }
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

.syntax-error-location {
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
