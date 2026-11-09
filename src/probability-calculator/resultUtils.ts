import {
  sampleOutcomes,
  type CalculationResult,
  type OutputResult,
} from '@/utils/dice-probability-calculator';
import { cryptoRng, type Rng } from '@/utils/rng';

export type DataMode = 'normal' | 'atLeast' | 'atMost';

export interface DisplayOutcome {
  value: number;
  probability: number;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ChartData {
  rows: Array<Record<string, string | number>>;
  series: ChartSeries[];
}

export interface TransposedTable {
  columns: string[];
  rows: Array<{ value: number; probabilities: number[] }>;
}

export interface OutputSummary {
  label: string;
  mean: number;
  stddev: number;
  min: number;
  max: number;
  outcomeCount: number;
  mostLikely: DisplayOutcome | null;
}

const CHART_COLORS = [
  '#3f51b5',
  '#00897b',
  '#e64a19',
  '#7b1fa2',
  '#1976d2',
  '#c2185b',
  '#388e3c',
  '#f57c00',
  '#5d4037',
  '#455a64',
];

export function outputLabel(output: OutputResult, index: number): string {
  return output.name?.trim() || `Output ${index + 1}`;
}

export function displayOutcomes(
  output: OutputResult,
  mode: DataMode,
): DisplayOutcome[] {
  const sorted = [...output.outcomes].sort((a, b) => a.value - b.value);

  if (mode === 'normal') {
    return sorted.map(({ value, probability }) => ({ value, probability }));
  }

  const result: DisplayOutcome[] = [];
  if (mode === 'atMost') {
    let cumulative = 0;
    for (const outcome of sorted) {
      cumulative += outcome.probability;
      result.push({ value: outcome.value, probability: cumulative });
    }
    return result;
  }

  // At least: start from the highest value and accumulate downwards.
  let cumulative = 0;
  const descending: DisplayOutcome[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const outcome = sorted[index];
    cumulative += outcome.probability;
    descending.push({ value: outcome.value, probability: cumulative });
  }
  return descending.reverse();
}

export function formatProbability(probability: number, digits = 2): string {
  return `${(probability * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function buildChartData(
  result: CalculationResult,
  mode: DataMode,
): ChartData {
  const series: ChartSeries[] = result.outputs.map((output, index) => ({
    key: `series${index}`,
    label: outputLabel(output, index),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  if (result.outputs.length === 0) return { rows: [], series };

  const outputOutcomes = result.outputs.map((output) =>
    displayOutcomes(output, mode),
  );
  const values = [
    ...new Set(
      outputOutcomes.flatMap((outcomes) => outcomes.map(({ value }) => value)),
    ),
  ].sort((a, b) => a - b);

  const rows = values.map((value) => {
    const row: Record<string, string | number> = { value };
    outputOutcomes.forEach((outcomes, index) => {
      const outcome = outcomes.find((entry) => entry.value === value);
      row[series[index].key] = outcome?.probability ?? 0;
    });
    return row;
  });

  return { rows, series };
}

export function buildTransposedTable(
  result: CalculationResult,
  mode: DataMode,
): TransposedTable {
  const outputs = result.outputs.map((output) => displayOutcomes(output, mode));
  const columns = result.outputs.map((output, index) =>
    outputLabel(output, index),
  );
  const values = [
    ...new Set(
      outputs.flatMap((outcomes) => outcomes.map(({ value }) => value)),
    ),
  ].sort((a, b) => a - b);

  return {
    columns,
    rows: values.map((value) => ({
      value,
      probabilities: outputs.map(
        (outcomes) =>
          outcomes.find((outcome) => outcome.value === value)?.probability ?? 0,
      ),
    })),
  };
}

export function buildExportText(
  result: CalculationResult,
  mode: DataMode,
): string {
  const lines = ['Output,Value,Probability'];
  result.outputs.forEach((output, index) => {
    const label = csvEscape(outputLabel(output, index));
    for (const outcome of displayOutcomes(output, mode)) {
      lines.push(
        `${label},${outcome.value},${formatProbability(outcome.probability, 4)}`,
      );
    }
  });
  return lines.join('\n');
}

export function summarizeOutput(
  output: OutputResult,
  index: number,
): OutputSummary {
  const values = output.outcomes.map(({ value }) => value);
  const mostLikely = output.outcomes.reduce<DisplayOutcome | null>(
    (best, outcome) =>
      !best || outcome.probability > best.probability
        ? { value: outcome.value, probability: outcome.probability }
        : best,
    null,
  );

  return {
    label: outputLabel(output, index),
    mean: output.mean,
    stddev: output.stddev,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    outcomeCount: output.outcomes.length,
    mostLikely,
  };
}

export function rollOutput(
  output: OutputResult,
  amount: number,
  rng: Rng = cryptoRng(),
): number[] {
  return sampleOutcomes(output.outcomes, amount, rng);
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
