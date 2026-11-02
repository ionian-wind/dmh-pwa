import { describe, expect, it } from 'vitest';
import { calculate } from '@/utils/dice-probability-calculator';
import {
  buildChartData,
  buildExportText,
  buildTransposedTable,
  displayOutcomes,
  formatProbability,
  outputLabel,
  rollOutput,
  summarizeOutput,
} from '../resultUtils';

describe('probability calculator result utilities', () => {
  const result = calculate('output 1d4 named "d4"');
  const output = result.outputs[0];

  it('keeps normal probabilities unchanged', () => {
    expect(displayOutcomes(output, 'normal')).toEqual([
      { value: 1, probability: 0.25 },
      { value: 2, probability: 0.25 },
      { value: 3, probability: 0.25 },
      { value: 4, probability: 0.25 },
    ]);
  });

  it('calculates at-least and at-most probabilities', () => {
    expect(displayOutcomes(output, 'atLeast')).toEqual([
      { value: 1, probability: 1 },
      { value: 2, probability: 0.75 },
      { value: 3, probability: 0.5 },
      { value: 4, probability: 0.25 },
    ]);
    expect(displayOutcomes(output, 'atMost')).toEqual([
      { value: 1, probability: 0.25 },
      { value: 2, probability: 0.5 },
      { value: 3, probability: 0.75 },
      { value: 4, probability: 1 },
    ]);
  });

  it('builds chart rows and series', () => {
    const chart = buildChartData(result, 'normal');
    expect(chart.series).toHaveLength(1);
    expect(chart.series[0].label).toBe('d4');
    expect(chart.rows).toEqual([
      { value: 1, series0: 0.25 },
      { value: 2, series0: 0.25 },
      { value: 3, series0: 0.25 },
      { value: 4, series0: 0.25 },
    ]);
  });

  it('builds transposed tables', () => {
    const twoOutputs = calculate('output 1d2 named "A"\noutput 1d3 named "B"');
    expect(buildTransposedTable(twoOutputs, 'normal')).toEqual({
      columns: ['A', 'B'],
      rows: [
        { value: 1, probabilities: [0.5, 1 / 3] },
        { value: 2, probabilities: [0.5, 1 / 3] },
        { value: 3, probabilities: [0, 1 / 3] },
      ],
    });
  });

  it('builds export text', () => {
    expect(buildExportText(result, 'normal')).toBe(
      [
        'Output,Value,Probability',
        '"d4",1,25.0000%',
        '"d4",2,25.0000%',
        '"d4",3,25.0000%',
        '"d4",4,25.0000%',
      ].join('\n'),
    );
  });

  it('summarizes outputs', () => {
    const summary = summarizeOutput(output, 0);
    expect(summary.label).toBe('d4');
    expect(summary.mean).toBe(2.5);
    expect(summary.min).toBe(1);
    expect(summary.max).toBe(4);
    expect(summary.outcomeCount).toBe(4);
    expect(summary.mostLikely?.value).toBe(1);
  });

  it('formats labels and probabilities', () => {
    expect(outputLabel(output, 0)).toBe('d4');
    expect(outputLabel(result.outputs[0], 2)).toBe('d4');
    expect(formatProbability(0.12345)).toBe('12.35%');
  });

  it('rolls values from the distribution', () => {
    const values = rollOutput(output, 20);
    expect(values).toHaveLength(20);
    expect(values.every((value) => value >= 1 && value <= 4)).toBe(true);
  });

  it('rolls nothing for an empty die', () => {
    expect(rollOutput(calculate('output d{}').outputs[0], 5)).toEqual([]);
  });
});
