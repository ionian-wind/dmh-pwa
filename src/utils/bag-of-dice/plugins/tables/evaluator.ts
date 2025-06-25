import { TableRollNode } from './converters';

// Table entry can be a string, or an object with value and weight/percent
export type TableEntry = string | { value: string; weight?: number; percent?: number };

export function evaluateTableRoll(
  ast: TableRollNode,
  rng: () => number = Math.random,
  ...args: any[]
): { table: string; results: string[] } {
  const tableData: Record<string, TableEntry[]> = args[0];
  const table = tableData[ast.table];
  if (!table || table.length === 0) {
    throw new Error(`Table '${ast.table}' not found or empty`);
  }
  const count = ast.count ?? 1;
  // Check for mixed weighting schemes
  const hasPercent = table.some(e => typeof e === 'object' && e.percent != null);
  const hasWeight = table.some(e => typeof e === 'object' && e.weight != null);
  if (hasPercent && hasWeight) {
    throw new Error(`Table '${ast.table}' cannot mix percent and weight entries`);
  }
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    results.push(pickTableEntry(table, rng));
  }
  return { table: ast.table, results };
}

function pickTableEntry(table: TableEntry[], rng: () => number): string {
  const hasPercent = table.some(e => typeof e === 'object' && e.percent != null);
  const hasWeight = table.some(e => typeof e === 'object' && e.weight != null);
  if (hasPercent && hasWeight) {
    throw new Error('Table cannot mix percent and weight entries');
  }
  if (hasPercent) {
    // Percentage table: sum percent, pick by random
    const percentTable = table as { value: string; percent: number }[];
    const total = percentTable.reduce((sum, e) => sum + (e.percent || 0), 0);
    if (total !== 100) throw new Error('Table percent values must sum to 100');
    let r = rng() * 100;
    for (const entry of percentTable) {
      if (r < (entry.percent || 0)) return entry.value;
      r -= entry.percent || 0;
    }
    // Fallback (should not happen)
    return percentTable[percentTable.length - 1].value;
  } else if (hasWeight) {
    // Weighted table: sum weights, pick by random
    const weightedTable = table as { value: string; weight: number }[];
    const total = weightedTable.reduce((sum, e) => sum + (e.weight || 1), 0);
    let r = rng() * total;
    for (const entry of weightedTable) {
      const w = entry.weight || 1;
      if (r < w) return entry.value;
      r -= w;
    }
    return weightedTable[weightedTable.length - 1].value;
  } else {
    // Simple table: pick random entry
    const arr = table.map(e => (typeof e === 'string' ? e : e.value));
    return arr[Math.floor(rng() * arr.length)];
  }
}
// TODO: Support table ranges, custom RNG injection, and richer entry types. 