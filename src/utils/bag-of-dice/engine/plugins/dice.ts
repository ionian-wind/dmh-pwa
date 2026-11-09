import type {
  ComparePoint,
  DiceGroupResult,
  DiceNode,
  DicePlugin,
  DieRecord,
  EvalContext,
  EvalResult,
  GroupedRollNode,
  ModifierNode,
  RollSegment,
  RollWarning,
} from '../contracts';
import { fail, rollWarning } from '../errors';
import { nextRandom, rollDie } from '../rng';
import { numberValue } from './arithmetic';

export function createDicePlugin(): DicePlugin {
  return {
    name: 'dice',
    tokens: [],
    evaluate(node, context): EvalResult | null {
      if (node.type === 'Dice') {
        return evaluateDice(node as DiceNode, context);
      }
      if (node.type === 'GroupedRoll') {
        return evaluateGrouped(node as GroupedRollNode, context);
      }
      return null;
    },
  };
}

type FaceRoller = () => number;

function evaluateDice(node: DiceNode, context: EvalContext): EvalResult {
  const countResult = context.evaluate(node.count);
  const sidesResult = context.evaluate(node.sides);
  const count = requireInteger(
    roundComputed(
      node.count,
      numberValue(countResult.value),
      node.computed === true,
    ),
    'dice count',
    node,
  );

  if (node.customFaces) {
    if (
      node.customFaces.length === 0 ||
      node.customFaces.some((face) => !Number.isFinite(face))
    ) {
      fail('VALIDATION_INVALID_DICE', 'custom dice need finite faces', {
        pass: 'evaluate',
        plugin: 'dice',
        span: node.span,
      });
    }
    return rollPool(
      node,
      context,
      count,
      node.customFaces.length,
      () => customRoll(node.customFaces ?? [], context),
      'custom',
      [...(countResult.arithmetic ?? []), ...(sidesResult.arithmetic ?? [])],
    );
  }

  if (node.fudge) {
    const variant = node.fudgeVariant ?? 0;
    if (variant < 0 || variant > 3) {
      fail(
        'VALIDATION_INVALID_DICE',
        `unsupported Fudge variant dF.${variant}`,
        {
          pass: 'evaluate',
          plugin: 'dice',
          span: node.span,
          params: { variant },
        },
      );
    }
    const faces = fudgeFaces(variant);
    return rollPool(
      node,
      context,
      count,
      3,
      () => faces[Math.floor(nextRandom(context.rng, 'dice') * faces.length)],
      'fudge',
      [...(countResult.arithmetic ?? []), ...(sidesResult.arithmetic ?? [])],
    );
  }

  const sides = requireInteger(
    roundComputed(
      node.sides,
      numberValue(sidesResult.value),
      node.computed === true,
    ),
    'dice sides',
    node,
  );
  return rollPool(
    node,
    context,
    count,
    sides,
    () => rollDie(context.rng, sides, 'dice'),
    'dice',
    [...(countResult.arithmetic ?? []), ...(sidesResult.arithmetic ?? [])],
  );
}

function rollPool(
  node: DiceNode,
  context: EvalContext,
  count: number,
  sides: number,
  rollFace: FaceRoller,
  kind: DiceGroupResult['kind'],
  arithmetic: EvalResult['arithmetic'],
): EvalResult {
  const id = context.nextGroupId();
  const records: DieRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    records.push({
      groupId: id,
      sides: kind === 'custom' ? null : sides,
      value: rollFace(),
      kept: true,
      dropped: false,
      ...(node.label ? { label: node.label } : {}),
      index,
    });
  }

  const group: DiceGroupResult = {
    id,
    kind,
    dice: records,
    total: 0,
    rawTotal: 0,
    modifiers: node.modifiers.map((modifier) => modifier.text),
    ...(node.label ? { labels: [node.label] } : {}),
    modifierOrder: node.modifiers.map((modifier) => modifier.name),
  };

  group.rawTotal = records.reduce((total, die) => total + die.value, 0);
  const applied = applyModifiers(
    records,
    node.modifiers,
    sides,
    group,
    context,
    rollFace,
  );
  group.total = applied.total;
  if (applied.success !== undefined) group.success = applied.success;
  if (applied.failure !== undefined) group.failure = applied.failure;
  if (applied.critical !== undefined) group.critical = applied.critical;

  const segments: RollSegment[] = [
    {
      kind: 'dice',
      text: diceText(node, count, sides, kind, records),
      groupIds: [id],
      result: group.total,
    },
    ...applied.segments,
    ...(node.label ? [{ kind: 'label' as const, text: node.label }] : []),
  ];

  return {
    value: group.total,
    records,
    groups: [group],
    segments,
    warnings: context.warnings,
    arithmetic,
  };
}

interface ModifierApplication {
  total: number;
  segments: RollSegment[];
  success?: number;
  failure?: number;
  critical?: number;
}

function applyModifiers(
  records: DieRecord[],
  modifiers: ModifierNode[],
  sides: number,
  group: DiceGroupResult,
  context: EvalContext,
  rollFace: FaceRoller,
): ModifierApplication {
  const segments: RollSegment[] = [];
  let success: number | undefined;
  let failure: number | undefined;
  let critical: number | undefined;
  let replacement: number | undefined;

  const phase = (names: string[]) => {
    for (const modifier of modifiers) {
      if (!names.includes(modifier.name)) continue;
      applyModifier(modifier, records, sides, context, rollFace, segments);
    }
  };

  phase(['r', 'ro', 'mi', 'ma']);
  phase(['!', '!p', '!!']);
  phase(['kh', 'kl', 'dh', 'dl', 'k', 'd']);

  for (const modifier of modifiers) {
    if (!['compare', 's', 'f', 'cs', 'cf'].includes(modifier.name)) continue;
    const compare = modifier.compare ?? { op: '=', value: 1 };
    const matches = records.filter(
      (die) => !die.dropped && compareDie(die, compare),
    ).length;
    if (modifier.name === 'compare' || modifier.name === 's') {
      success = matches;
      replacement = matches;
      segments.push(modifierSegment(modifier, matches));
    } else if (modifier.name === 'f') {
      failure = matches;
      replacement = (success ?? 0) - matches;
      segments.push(modifierSegment(modifier, matches));
    } else if (modifier.name === 'cs') {
      critical = matches;
      segments.push(modifierSegment(modifier, matches));
    } else if (modifier.name === 'cf') {
      critical = matches;
      segments.push(modifierSegment(modifier, matches));
    }
  }

  // `e` exhaustive successes runs after success counting.
  const exhaustive = modifiers.find((modifier) => modifier.name === 'e');
  if (exhaustive) {
    const compare = modifiers.find((modifier) =>
      ['compare', 's'].includes(modifier.name),
    )?.compare ?? { op: '>=', value: 1 };
    const extra = exhaustSuccesses(records, compare, sides, context, rollFace);
    success = (success ?? 0) + extra;
    replacement = success;
    segments.push(modifierSegment(exhaustive, extra));
  }

  for (const modifier of modifiers) {
    if (modifier.name !== 'm' && modifier.name !== 'mt') continue;
    const count = applyMatch(records, modifier);
    segments.push(modifierSegment(modifier, count));
    if (modifier.name === 'mt') {
      replacement = count;
      success = count;
    }
  }

  for (const modifier of modifiers) {
    if (!['s', 'sa', 'sd'].includes(modifier.name)) continue;
    sortRecords(records, modifier);
    segments.push(modifierSegment(modifier, undefined));
  }

  const keptTotal = records
    .filter((die) => !die.dropped)
    .reduce((total, die) => total + die.value, 0);

  return {
    total: replacement ?? keptTotal,
    segments,
    ...(success !== undefined ? { success } : {}),
    ...(failure !== undefined ? { failure } : {}),
    ...(critical !== undefined ? { critical } : {}),
  };
}

function applyModifier(
  modifier: ModifierNode,
  records: DieRecord[],
  sides: number,
  context: EvalContext,
  rollFace: FaceRoller,
  segments: RollSegment[],
): void {
  switch (modifier.name) {
    case 'r':
    case 'ro':
      reroll(records, modifier, context, rollFace);
      segments.push(modifierSegment(modifier, undefined));
      break;
    case 'mi':
    case 'ma': {
      const amount = modifier.argument ?? 1;
      for (const die of records) {
        if (die.dropped) continue;
        die.originalValue ??= die.value;
        die.value =
          modifier.name === 'mi'
            ? Math.max(die.value, amount)
            : Math.min(die.value, amount);
      }
      segments.push(modifierSegment(modifier, undefined));
      break;
    }
    case '!':
    case '!p':
    case '!!':
      explode(records, modifier, sides, context, rollFace);
      segments.push(modifierSegment(modifier, records.length));
      break;
    case 'kh':
    case 'kl':
    case 'dh':
    case 'dl':
    case 'k':
    case 'd':
      keepDrop(records, modifier);
      segments.push(modifierSegment(modifier, undefined));
      break;
    default:
      break;
  }
}

function reroll(
  records: DieRecord[],
  modifier: ModifierNode,
  context: EvalContext,
  rollFace: FaceRoller,
): void {
  const compare = modifier.compare ?? { op: '=', value: 1 };
  const once = modifier.name === 'ro';
  let rerolls = 0;
  for (const die of records) {
    if (die.dropped) continue;
    let guard = 0;
    while (compareDie(die, compare)) {
      if (rerolls >= context.limits.maxExplosionRolls) {
        limitWarning(context, modifier);
        break;
      }
      die.originalValue ??= die.value;
      die.value = rollFace();
      die.rerolled = true;
      rerolls += 1;
      guard += 1;
      if (once || guard > context.limits.maxExplosionRolls) break;
    }
  }
}

function explode(
  records: DieRecord[],
  modifier: ModifierNode,
  sides: number,
  context: EvalContext,
  rollFace: FaceRoller,
): void {
  const compare = modifier.compare ?? {
    op: '=',
    value: Math.max(1, sides),
  };
  const cap = context.limits.maxExplosionRolls;
  let extra = 0;
  const queue = [...records];
  const compound = modifier.name === '!!';
  const penetrating = modifier.name === '!p';

  for (let index = 0; index < queue.length; index += 1) {
    const die = queue[index];
    let testValue = die.value;
    while (compareValue(testValue, compare)) {
      if (extra >= cap) {
        limitWarning(context, modifier);
        break;
      }
      const raw = rollFace();
      extra += 1;
      if (compound) {
        die.value += raw;
        die.compounded = true;
        testValue = raw;
      } else {
        const value = penetrating ? Math.max(1, raw - 1) : raw;
        const extraDie: DieRecord = {
          groupId: die.groupId,
          sides: die.sides,
          value,
          kept: true,
          dropped: false,
          exploded: true,
          ...(penetrating ? { penetrating: true } : {}),
          ...(die.label ? { label: die.label } : {}),
          index: records.length,
        };
        records.push(extraDie);
        queue.push(extraDie);
        testValue = raw;
      }
      if (queue.length > 10_000) break;
    }
  }
}

function keepDrop(records: DieRecord[], modifier: ModifierNode): void {
  const amount = Math.max(1, Math.floor(modifier.argument ?? 1));
  const candidates = records.filter((die) => !die.dropped);
  const ordered = [...candidates].sort((left, right) => {
    if (left.value === right.value) {
      return (left.index ?? 0) - (right.index ?? 0);
    }
    return left.value - right.value;
  });
  const keepHighest = modifier.name === 'kh' || modifier.name === 'k';
  const keepLowest = modifier.name === 'kl';
  const dropHighest = modifier.name === 'dh';
  const dropLowest = modifier.name === 'dl' || modifier.name === 'd';

  let selected: DieRecord[] = [];
  if (keepHighest) selected = ordered.slice(-amount);
  else if (keepLowest) selected = ordered.slice(0, amount);
  else if (dropHighest)
    selected = ordered.slice(0, Math.max(0, ordered.length - amount));
  else if (dropLowest) selected = ordered.slice(amount);

  if (keepHighest || keepLowest) {
    const kept = new Set(selected);
    for (const die of candidates) {
      die.kept = kept.has(die);
      die.dropped = !die.kept;
    }
  } else {
    const kept = new Set(selected);
    for (const die of candidates) {
      die.kept = kept.has(die);
      die.dropped = !die.kept;
    }
  }
}

function exhaustSuccesses(
  records: DieRecord[],
  compare: ComparePoint,
  sides: number,
  context: EvalContext,
  rollFace: FaceRoller,
): number {
  const cap = context.limits.maxExplosionRolls;
  let extra = 0;
  let successes = 0;
  const queue = records.filter(
    (die) => !die.dropped && compareDie(die, compare),
  );
  for (let index = 0; index < queue.length; index += 1) {
    const die = queue[index];
    const raw = rollFace();
    extra += 1;
    if (extra > cap) {
      limitWarning(context, null);
      break;
    }
    const extraDie: DieRecord = {
      groupId: die.groupId,
      sides: die.sides,
      value: raw,
      kept: true,
      dropped: false,
      exploded: true,
      ...(die.label ? { label: die.label } : {}),
      index: records.length,
    };
    records.push(extraDie);
    if (compareDie(extraDie, compare)) {
      successes += 1;
      queue.push(extraDie);
    }
  }
  void sides;
  return successes;
}

function limitWarning(context: EvalContext, modifier: ModifierNode | null) {
  context.warnings.push(
    rollWarning(
      'LIMIT_EXPLOSION',
      'explosion/reroll limit reached; rolling stopped',
      {
        pass: 'evaluate',
        plugin: 'dice',
        ...(modifier ? { span: modifier.span } : {}),
        params: { limit: context.limits.maxExplosionRolls },
      },
    ),
  );
}

function evaluateGrouped(
  node: GroupedRollNode,
  context: EvalContext,
): EvalResult {
  for (const roll of node.rolls) {
    if (!containsDice(roll)) {
      fail(
        'VALIDATION_INVALID_MODIFIER',
        'grouped roll members must contain dice',
        {
          pass: 'evaluate',
          plugin: 'dice',
          span: roll.span,
        },
      );
    }
  }
  const results = node.rolls.map((roll) => context.evaluate(roll));
  const subGroups = results.flatMap((result) => result.groups ?? []);
  const records = results.flatMap((result) => result.records);
  const segments = results.flatMap((result) => result.segments);
  const totals = results.map((result) => numberValue(result.value));
  const id = context.nextGroupId();
  const group: DiceGroupResult = {
    id,
    kind: 'group',
    dice: records,
    total: totals.reduce((sum, value) => sum + value, 0),
    rawTotal: records.reduce((sum, die) => sum + die.value, 0),
    modifiers: node.modifiers.map((modifier) => modifier.text),
    modifierOrder: node.modifiers.map((modifier) => modifier.name),
    ...(node.label ? { labels: [node.label] } : {}),
  };

  let total = numberValue(results[0]?.value ?? 0);
  if (node.rolls.length > 1) {
    total = totals.reduce((sum, value) => sum + value, 0);
  }
  let success: number | undefined;
  let failure: number | undefined;
  let critical: number | undefined;
  let replacement: number | undefined;

  const single = node.rolls.length === 1;
  for (const modifier of node.modifiers) {
    if (['kh', 'kl', 'dh', 'dl', 'k', 'd'].includes(modifier.name)) {
      if (single) {
        keepDrop(records, modifier);
        segments.push(modifierSegment(modifier, undefined));
      } else {
        const amount = Math.max(1, Math.floor(modifier.argument ?? 1));
        const ordered = [...totals].sort((left, right) => left - right);
        const keepHighest = modifier.name === 'kh' || modifier.name === 'k';
        const keepLowest = modifier.name === 'kl';
        const dropHighest = modifier.name === 'dh';
        const dropLowest = modifier.name === 'dl' || modifier.name === 'd';
        let selected: number[];
        if (keepHighest) selected = ordered.slice(-amount);
        else if (keepLowest) selected = ordered.slice(0, amount);
        else if (dropHighest)
          selected = ordered.slice(0, Math.max(0, ordered.length - amount));
        else if (dropLowest) selected = ordered.slice(amount);
        else selected = ordered;
        replacement = selected.reduce((sum, value) => sum + value, 0);
        segments.push({
          kind: 'modifier',
          text: modifier.text,
          modifier: modifier.name,
        });
      }
      continue;
    }

    if (['s', 'sa', 'sd'].includes(modifier.name)) {
      if (single) {
        sortRecords(records, modifier);
        segments.push(modifierSegment(modifier, undefined));
      }
      continue;
    }

    if (modifier.name === 'm' || modifier.name === 'mt') {
      if (single) {
        const count = applyMatch(records, modifier);
        segments.push(modifierSegment(modifier, count));
        if (modifier.name === 'mt') {
          replacement = count;
          success = count;
        }
      }
      continue;
    }

    if (['compare', 's', 'f', 'cs', 'cf'].includes(modifier.name)) {
      const compare = modifier.compare ?? { op: '=', value: 1 };
      const matches = single
        ? records.filter((die) => !die.dropped && compareDie(die, compare))
            .length
        : totals.filter((value) => compareNumber(value, compare)).length;
      if (modifier.name === 'compare' || modifier.name === 's') {
        success = matches;
        replacement = matches;
      } else if (modifier.name === 'f') {
        failure = matches;
        replacement = (success ?? 0) - matches;
      } else {
        critical = matches;
      }
      segments.push(modifierSegment(modifier, matches));
    }
  }

  if (single && replacement === undefined) {
    total = records
      .filter((die) => !die.dropped)
      .reduce((sum, die) => sum + die.value, 0);
  } else if (replacement !== undefined) {
    total = replacement;
  }

  group.total = total;
  if (success !== undefined) group.success = success;
  if (failure !== undefined) group.failure = failure;
  if (critical !== undefined) group.critical = critical;

  return {
    value: total,
    records,
    groups: [...subGroups, group],
    segments: [
      ...segments,
      {
        kind: 'dice',
        text: `{${totals.join(', ')}}`,
        groupIds: [id, ...subGroups.map((sub) => sub.id)],
        result: total,
      },
      ...(node.label ? [{ kind: 'label' as const, text: node.label }] : []),
    ],
    warnings: context.warnings,
    arithmetic: results.flatMap((result) => result.arithmetic ?? []),
  };
}

function containsDice(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  if (
    record.type === 'Dice' ||
    record.type === 'GroupedRoll' ||
    record.type === 'TableRoll'
  ) {
    return true;
  }
  for (const key of ['left', 'right', 'operand', 'count', 'sides']) {
    if (containsDice(record[key])) return true;
  }
  for (const key of ['args', 'rolls']) {
    const children = record[key];
    if (Array.isArray(children) && children.some(containsDice)) return true;
  }
  return false;
}

function roundComputed(
  node: { type: string },
  value: number,
  computed: boolean,
): number {
  return computed || node.type !== 'NumberLiteral' ? Math.round(value) : value;
}

function requireInteger(value: number, label: string, node: DiceNode): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    fail('VALIDATION_INVALID_DICE', `${label} must be a positive integer`, {
      pass: 'evaluate',
      plugin: 'dice',
      span: node.span,
      params: { label, value },
    });
  }
  return value;
}

function fudgeFaces(variant: number): number[] {
  switch (variant) {
    case 1:
      return [0, 1];
    case 3:
      return [-1, 0];
    case 0:
    case 2:
    default:
      return [-1, 0, 1];
  }
}

function customRoll(faces: number[], context: EvalContext): number {
  const index = Math.floor(nextRandom(context.rng, 'dice') * faces.length);
  return faces[Math.min(index, faces.length - 1)];
}

function compareDie(die: DieRecord, compare: ComparePoint): boolean {
  return compareNumber(die.value, compare);
}

function compareNumber(value: number, compare: ComparePoint): boolean {
  switch (compare.op) {
    case '=':
      return value === compare.value;
    case '!=':
      return value !== compare.value;
    case '>':
      // Roll20/reference compatibility: target numbers are inclusive.
      return value >= compare.value;
    case '>=':
      return value >= compare.value;
    case '<':
      return value <= compare.value;
    case '<=':
      return value <= compare.value;
    default:
      return false;
  }
}

function compareValue(value: number, compare: ComparePoint): boolean {
  return compareNumber(value, compare);
}

function applyMatch(records: DieRecord[], modifier: ModifierNode): number {
  const minimum = Math.max(2, Math.floor(modifier.argument ?? 2));
  const counts = new Map<number, number>();
  for (const die of records) {
    if (die.dropped) continue;
    counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
  }
  const matches = new Set<number>();
  for (const [value, count] of counts) {
    if (count < minimum) continue;
    if (modifier.compare && !compareNumber(value, modifier.compare)) continue;
    matches.add(value);
  }
  for (const die of records) {
    if (!die.dropped && matches.has(die.value)) die.matched = true;
  }
  return matches.size;
}

function highestFrequency(records: DieRecord[]): number {
  const counts = new Map<number, number>();
  for (const die of records) {
    if (die.dropped) continue;
    counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function sortRecords(records: DieRecord[], modifier: ModifierNode): void {
  const direction = modifier.name === 'sd' ? -1 : 1;
  records.sort((left, right) => {
    if (left.value === right.value) return 0;
    return (left.value - right.value) * direction;
  });
}

function modifierSegment(
  modifier: ModifierNode,
  result: number | undefined,
): RollSegment {
  return {
    kind: 'modifier',
    text: modifier.text,
    modifier: modifier.name,
    ...(result !== undefined ? { result } : {}),
  };
}

function diceText(
  node: DiceNode,
  count: number,
  sides: number,
  kind: DiceGroupResult['kind'],
  records: DieRecord[],
): string {
  const expression =
    kind === 'custom'
      ? `${count}d[${(node.customFaces ?? []).join(',')}]`
      : kind === 'fudge'
        ? `${count}dF${node.fudgeVariant ? `.${node.fudgeVariant}` : ''}`
        : `${count}d${sides}`;
  const values = records
    .map((die) => {
      const suffix = die.dropped ? ' (dropped)' : '';
      return `${die.value}${suffix}`;
    })
    .join(', ');
  return `${expression} [${values}]`;
}
