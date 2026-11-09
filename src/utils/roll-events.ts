/**
 * Unified roll-event format.
 *
 * The core fields intentionally mirror a `bag-of-dice` execution result
 * (`schemaVersion`, `total`, `breakdown`, `process`, `warnings`) so the same
 * history/card pipeline can consume both engine and 3D-tray rolls. The 3D tray
 * adds `source`, `createdAt`, `pool` and per-die records.
 */

export const ROLL_EVENT_NAME = 'dice-roller:roll';

export type RollEventSource = 'engine' | '3d-dice-tray';

export interface RollEventDie {
  id: string;
  sides: number;
  kind?: string;
  value: number;
  label?: string;
  notation?: string;
  explode?: string;
  isExtra?: boolean;
  penalty?: number;
  rootId?: string;
}

export interface RollEventSegment {
  kind: 'dice' | 'modifier' | 'math' | 'label' | 'table' | 'text' | 'unknown';
  text: string;
  result?: number;
  groupIds?: string[];
  modifier?: string;
  table?: string;
  label?: string;
}

export interface RollEventGroup {
  id: string;
  kind?: string;
  dice: RollEventDie[];
  total: number;
  rawTotal: number;
  modifierOrder?: string[];
}

export interface RollEventWarning {
  code: string;
  message: string;
  pass: string;
  plugin?: string;
  params?: Record<string, unknown>;
}

export interface RollEventPass {
  name: string;
  input: string;
  output: string;
  warnings: RollEventWarning[];
}

export interface RollEventBreakdown {
  segments: RollEventSegment[];
  groups: RollEventGroup[];
  rawTotal: number;
  finalTotal: number;
}

export interface RollEventProcess {
  raw: string;
  expanded: string;
  passes: RollEventPass[];
  expansions: [];
  queries: [];
  inlineRolls: [];
  arithmetic: [];
  tables: [];
}

export interface DiceRollEvent {
  schemaVersion: 1;
  source: RollEventSource;
  id: string;
  createdAt: number;
  pool: boolean;
  mode?: string;
  total: number;
  breakdown: RollEventBreakdown;
  process: RollEventProcess;
  warnings: RollEventWarning[];
  dice: RollEventDie[];
  replay?: { seed?: string };
}

interface EventOptions {
  id?: string;
  createdAt?: number;
  source?: RollEventSource;
  mode?: string;
  raw?: string;
  expanded?: string;
  warnings?: RollEventWarning[];
}

let eventCounter = 0;

function nextEventId(prefix: string): string {
  eventCounter += 1;
  return `${prefix}-${Date.now()}-${eventCounter}`;
}

export function dieNotation(die: RollEventDie): string {
  if (die.notation) return die.notation;
  if (die.kind === 'fate') return '1dF';
  return `1d${die.sides}`;
}

export function dieLabel(die: RollEventDie): string {
  return die.label ?? (die.kind === 'fate' ? 'FUDGE' : `d${die.sides}`);
}

function eventBase(
  dice: RollEventDie[],
  pool: boolean,
  options: EventOptions,
): DiceRollEvent {
  const createdAt = options.createdAt ?? Date.now();
  const raw =
    options.raw ??
    [...new Set(dice.map((die) => dieNotation(die)))].join(' + ');
  const expanded =
    options.expanded ?? dice.map((die) => dieNotation(die)).join(' + ');
  const total = dice.reduce((sum, die) => sum + die.value, 0);
  const rawTotal = dice.reduce(
    (sum, die) => sum + die.value + (die.penalty ?? 0),
    0,
  );
  const groups: RollEventGroup[] = dice.map((die) => ({
    id: die.id,
    kind: die.kind,
    dice: [die],
    total: die.value,
    rawTotal: die.value + (die.penalty ?? 0),
    ...(die.explode ? { modifierOrder: [die.explode] } : {}),
  }));
  const segments: RollEventSegment[] = dice.flatMap((die) => [
    {
      kind: 'dice' as const,
      text: `${dieNotation(die)} = ${die.value}`,
      result: die.value,
      groupIds: [die.id],
    },
    ...(die.explode
      ? [
          {
            kind: 'modifier' as const,
            text: die.explode,
            modifier: die.explode,
          },
        ]
      : []),
  ]);
  const passes: RollEventPass[] = [
    {
      name: 'expand',
      input: raw,
      output: expanded,
      warnings: [],
    },
    {
      name: 'roll',
      input: expanded,
      output: dice.map((die) => String(die.value)).join(', '),
      warnings: [],
    },
    {
      name: 'physics',
      input: expanded,
      output: `total ${total}`,
      warnings: [],
    },
  ];
  return {
    schemaVersion: 1,
    source: options.source ?? '3d-dice-tray',
    id: options.id ?? nextEventId(pool ? 'pool' : 'die'),
    createdAt,
    pool,
    ...(options.mode ? { mode: options.mode } : {}),
    total,
    breakdown: { segments, groups, rawTotal, finalTotal: total },
    process: {
      raw,
      expanded,
      passes,
      expansions: [],
      queries: [],
      inlineRolls: [],
      arithmetic: [],
      tables: [],
    },
    warnings: options.warnings ?? [],
    dice,
  };
}

/** One settled die (d100 stays one event with its combined value). */
export function createDieRollEvent(
  die: RollEventDie,
  options: EventOptions = {},
): DiceRollEvent {
  return eventBase([die], false, {
    ...options,
    ...(die.explode ? { mode: options.mode ?? die.explode } : {}),
  });
}

/** The whole settled tray/pool, including explosion extras. */
export function createPoolRollEvent(
  dice: RollEventDie[],
  options: EventOptions = {},
): DiceRollEvent {
  return eventBase(dice, true, options);
}

/** Emit the event for history consumers. */
export function dispatchRollEvent(event: DiceRollEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ROLL_EVENT_NAME, { detail: event }));
}
