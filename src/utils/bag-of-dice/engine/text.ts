import type { RollResult, RollSegment } from './contracts';

/** Stable, accessible text for a roll result. */
export function renderText(result: RollResult): string {
  const parts = result.breakdown.segments.map(segmentText);
  const body = parts.filter(Boolean).join(' ');
  return `${body} = ${format(result.total)}`;
}

export function segmentText(segment: RollSegment): string {
  switch (segment.kind) {
    case 'dice':
      return segment.text;
    case 'modifier':
      return segment.text;
    case 'math':
      return segment.text;
    case 'label':
      return `[${segment.text}]`;
    case 'table':
      return segment.text;
    case 'text':
      return segment.text;
    default:
      return '';
  }
}

/** A 2D breakdown groups segments by their owning dice group. */
export function render2d(result: RollResult): string[] {
  return result.breakdown.groups.map((group) => {
    const dice = group.dice
      .map((die) => (die.dropped ? `~~${die.value}~~` : String(die.value)))
      .join(', ');
    const label = group.labels?.length ? ` (${group.labels.join(', ')})` : '';
    return `${group.id}${label}: [${dice}] = ${format(group.total)}`;
  });
}

function format(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}
