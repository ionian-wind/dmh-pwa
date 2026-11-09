import type { DiceVisual, DieKind } from './DiceRenderer';

/** A single mesh the renderer must display. d100 becomes two d10 meshes. */
export interface VisualDiePart {
  id: string;
  kind: DieKind;
  /** Face value encoded by the asset's collider face map. */
  faceValue: number;
  /** Authoritative engine value for the whole visual. */
  value: number;
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

export function visualDiceFor(visual: DiceVisual): VisualDiePart[] {
  const sides = Math.round(visual.sides);
  const kind = dieKindForSides(sides);
  const value = normalizeValue(visual.value, sides);

  if (kind === 'd100') {
    const { tens, units } = splitD100(value);
    return [
      {
        id: `${visual.id}:tens`,
        kind: 'd100',
        faceValue: tens,
        value,
        sides,
        part: 'tens',
      },
      {
        id: `${visual.id}:units`,
        kind: 'd10',
        faceValue: units,
        value,
        sides,
        part: 'units',
      },
    ];
  }

  return [
    {
      id: visual.id,
      kind,
      faceValue: value,
      value,
      sides,
      part: 'whole',
    },
  ];
}
