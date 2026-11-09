import type { DiceVisual, DieKind } from './DiceRenderer';

/** A single mesh the renderer must display. d100 becomes two d10 meshes. */
export interface VisualDiePart {
  id: string;
  kind: DieKind;
  sides: number;
  part: 'whole' | 'tens' | 'units';
}

/** d4 results are read from the face touching the table, like dice-box. */
export const FACE_DOWN_DICE = new Set<DieKind>(['d4']);

export function dieKindForSides(sides: number): DieKind {
  const rounded = Math.round(sides);
  if (
    rounded === 2 ||
    rounded === 4 ||
    rounded === 6 ||
    rounded === 8 ||
    rounded === 10 ||
    rounded === 12 ||
    rounded === 20 ||
    rounded === 100
  ) {
    return `d${rounded}` as DieKind;
  }
  throw new Error(`unsupported die sides: ${sides}`);
}

export function normalizeValue(value: number, sides: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), Math.round(sides));
}

/**
 * Split a percentile result into the two physical d10 faces.
 *
 * The tens die uses the d100 asset (faces 0, 10, ... 90); the units die uses
 * the d10 asset (faces 1..10, where 10 renders as 0). `100` is `00 + 0`.
 */
export function splitD100(value: number): { tens: number; units: number } {
  const normalized = normalizeValue(value, 100);
  const effective = normalized === 100 ? 0 : normalized;
  const unit = effective % 10;
  return {
    tens: Math.floor(effective / 10) * 10,
    units: unit === 0 ? 10 : unit,
  };
}

/** Compose a d100 result from the two landed d10 faces. */
export function composeD100(tens: number, units: number): number {
  const unit = units === 10 ? 0 : units;
  const value = tens + unit;
  return value === 0 ? 100 : value;
}

export function visualDiceForSides(sides: number): VisualDiePart[] {
  const rounded = Math.round(sides);
  const kind = dieKindForSides(rounded);
  if (kind === 'd100') {
    return [
      { id: 'tens', kind: 'd100', sides: rounded, part: 'tens' },
      { id: 'units', kind: 'd10', sides: rounded, part: 'units' },
    ];
  }
  return [{ id: 'whole', kind, sides: rounded, part: 'whole' }];
}

/** Random result used only when physics is disabled (reduced motion). */
export function randomValueFor(visual: DiceVisual): number {
  const sides = Math.round(visual.sides);
  return Math.floor(Math.random() * sides) + 1;
}
