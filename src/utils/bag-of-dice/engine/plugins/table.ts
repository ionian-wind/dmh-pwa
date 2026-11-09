import type {
  DiceGroupResult,
  DicePlugin,
  EvalContext,
  EvalResult,
  TableDefinition,
  TableRollNode,
  TableSelectionRecord,
} from '../contracts';
import { fail, rollWarning } from '../errors';
import { nextRandom } from '../rng';
import { numberValue } from './arithmetic';

export const TABLE_CACHE_PREFIX = 'table:';
export const TABLE_MISSING_PREFIX = 'table-missing:';

export function tableCacheKey(name: string): string {
  return `${TABLE_CACHE_PREFIX}${name.trim().toLowerCase()}`;
}

export function tableMissingKey(name: string): string {
  return `${TABLE_MISSING_PREFIX}${name.trim().toLowerCase()}`;
}

export function createTablePlugin(): DicePlugin {
  return {
    name: 'table',
    tokens: [],
    evaluate(node, context): EvalResult | null {
      if (node.type !== 'TableRoll') return null;
      return evaluateTable(node as TableRollNode, context);
    },
  };
}

function evaluateTable(node: TableRollNode, context: EvalContext): EvalResult {
  const count = numberValue(context.evaluate(node.count).value);
  if (!Number.isInteger(count) || count < 1) {
    fail(
      'VALIDATION_INVALID_MODIFIER',
      'table count must be a positive integer',
      {
        pass: 'evaluate',
        plugin: 'table',
        span: node.span,
        params: { count },
      },
    );
  }

  const key = tableCacheKey(node.table);
  const table = context.cache.get(key) as TableDefinition | undefined;
  if (!table) {
    const noError = context.cache.get('noerror') === true;
    if (noError) {
      context.warnings.push(
        rollWarning('TABLE_MISSING', `missing table "${node.table}"`, {
          pass: 'evaluate',
          plugin: 'table',
          span: node.span,
          params: { table: node.table },
        }),
      );
      return {
        value: 0,
        records: [],
        segments: [
          {
            kind: 'text',
            text: `[table ${node.table} missing]`,
          },
        ],
        tables: [],
      };
    }
    fail('TABLE_MISSING', `missing table "${node.table}"`, {
      pass: 'evaluate',
      plugin: 'table',
      span: node.span,
      params: { table: node.table },
    });
  }

  if (table.entries.length === 0) {
    fail('TABLE_MISSING', `table "${node.table}" has no entries`, {
      pass: 'evaluate',
      plugin: 'table',
      span: node.span,
      params: { table: node.table },
    });
  }

  const mode = weightMode(table);
  const totalWeight = table.entries.reduce(
    (sum, entry) => sum + Math.max(0, entry.weight),
    0,
  );
  if (totalWeight <= 0) {
    fail('TABLE_MISSING', `table "${node.table}" has no positive weights`, {
      pass: 'evaluate',
      plugin: 'table',
      span: node.span,
      params: { table: node.table },
    });
  }

  const id = context.nextGroupId();
  const selections: TableSelectionRecord[] = [];
  const segments: EvalResult['segments'] = [];
  const group: DiceGroupResult = {
    id,
    kind: 'table',
    dice: [],
    total: 0,
    rawTotal: 0,
    modifiers: [],
    labels: [node.table],
  };

  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = pickEntry(table, context, totalWeight);
    const weight = mode === 'percentage' ? entry.weight / 100 : entry.weight;
    selections.push({
      table: node.table,
      index,
      value: entry.value,
      weight,
      depth: 0,
    });

    let entryValue: number | undefined;
    let nested: EvalResult | undefined;
    if (entry.inlineRoll) {
      nested = context.evaluateText?.(entry.inlineRoll);
    } else if (looksLikeRoll(entry.value)) {
      nested = context.evaluateText?.(entry.value);
    }
    if (nested) {
      entryValue = numberValue(nested.value);
      if (nested.tables) selections.push(...nested.tables);
      if (nested.segments) segments.push(...nested.segments);
    }
    if (entryValue === undefined) {
      const parsed = Number.parseFloat(entry.value);
      entryValue = Number.isFinite(parsed) ? parsed : 0;
    }
    total += entryValue;
    segments.push({
      kind: 'table',
      text: `${node.table}: ${entry.value}`,
      table: node.table,
      result: entryValue,
    });
  }

  group.total = total;
  group.rawTotal = total;

  return {
    value: total,
    records: [],
    groups: [group],
    segments,
    tables: selections,
    warnings: context.warnings,
  };
}

type WeightMode = 'percentage' | 'count';

function weightMode(table: TableDefinition): WeightMode {
  const sum = table.entries.reduce((total, entry) => total + entry.weight, 0);
  const allPercentage = table.entries.every(
    (entry) => entry.weight >= 0 && entry.weight <= 100,
  );
  return allPercentage && Math.abs(sum - 100) <= 0.01 ? 'percentage' : 'count';
}

function looksLikeRoll(value: string): boolean {
  return /\[\[|\d*\s*t\[|\d+\s*d\s*\d/i.test(value);
}

function pickEntry(
  table: TableDefinition,
  context: EvalContext,
  totalWeight: number,
) {
  const draw = nextRandom(context.rng, 'table') * totalWeight;
  let cursor = 0;
  for (const entry of table.entries) {
    cursor += Math.max(0, entry.weight);
    if (draw < cursor) return entry;
  }
  return table.entries[table.entries.length - 1];
}
