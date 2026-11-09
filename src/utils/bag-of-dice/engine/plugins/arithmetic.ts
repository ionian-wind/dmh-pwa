import type {
  AstNode,
  BinaryOpNode,
  DicePlugin,
  EvalContext,
  EvalResult,
  FunctionCallNode,
  NumberLiteralNode,
  RollSegment,
  UnaryOpNode,
} from '../contracts';
import { fail } from '../errors';

const MATH_FUNCTIONS = new Set(['floor', 'ceil', 'round', 'abs', 'min', 'max']);

function labelSegment(node: AstNode): RollSegment[] {
  return node.label ? [{ kind: 'label', text: node.label }] : [];
}

export function createArithmeticPlugin(): DicePlugin {
  return {
    name: 'arithmetic',
    tokens: [],
    evaluate(node: AstNode, context: EvalContext): EvalResult | null {
      switch (node.type) {
        case 'NumberLiteral': {
          const result = numeric((node as NumberLiteralNode).value, node.type);
          return {
            ...result,
            segments: [...result.segments, ...labelSegment(node)],
          };
        }
        case 'UnaryOp': {
          const result = unary(node as UnaryOpNode, context);
          return {
            ...result,
            segments: [...result.segments, ...labelSegment(node)],
          };
        }
        case 'BinaryOp': {
          const result = binary(node as BinaryOpNode, context);
          return {
            ...result,
            segments: [...result.segments, ...labelSegment(node)],
          };
        }
        case 'FunctionCall': {
          const result = fn(node as FunctionCallNode, context);
          return {
            ...result,
            segments: [...result.segments, ...labelSegment(node)],
          };
        }
        default:
          return null;
      }
    },
  };
}

function numeric(value: number, nodeType: string): EvalResult {
  const segments: RollSegment[] = [
    { kind: 'math', text: formatNumber(value), result: value },
  ];
  return {
    value,
    records: [],
    segments,
    arithmetic: [
      {
        expression: nodeType,
        result: value,
        nodeType,
      },
    ],
  };
}

function unary(node: UnaryOpNode, context: EvalContext): EvalResult {
  const child = context.evaluate(node.operand);
  const value = numberValue(child.value);
  const result = node.op === '-' ? -value : value;
  return {
    value: result,
    records: child.records,
    segments: [
      ...child.segments,
      { kind: 'math', text: formatNumber(result), result },
    ],
    arithmetic: [
      ...(child.arithmetic ?? []),
      { expression: `unary ${node.op}`, result, nodeType: node.type },
    ],
    ...(child.groups ? { groups: child.groups } : {}),
    ...(child.tables ? { tables: child.tables } : {}),
  };
}

function binary(node: BinaryOpNode, context: EvalContext): EvalResult {
  const left = context.evaluate(node.left);
  const right = context.evaluate(node.right);
  const leftValue = numberValue(left.value);
  const rightValue = numberValue(right.value);
  let result: number;
  switch (node.op) {
    case '+':
      result = leftValue + rightValue;
      break;
    case '-':
      result = leftValue - rightValue;
      break;
    case '*':
      result = leftValue * rightValue;
      break;
    case '/':
      if (rightValue === 0) {
        fail('MATH_DIVIDE_BY_ZERO', 'division by zero', {
          pass: 'evaluate',
          plugin: 'arithmetic',
          span: node.span,
          params: { operator: '/' },
        });
      }
      result = leftValue / rightValue;
      break;
    case '%':
      if (rightValue === 0) {
        fail('MATH_DIVIDE_BY_ZERO', 'modulus by zero', {
          pass: 'evaluate',
          plugin: 'arithmetic',
          span: node.span,
          params: { operator: '%' },
        });
      }
      result = leftValue % rightValue;
      break;
    case '**':
      result = leftValue ** rightValue;
      break;
    default:
      return fail('INTERNAL', `unknown operator ${String(node.op)}`, {
        pass: 'evaluate',
        plugin: 'arithmetic',
        span: node.span,
      });
  }

  if (!Number.isFinite(result)) {
    fail('MATH_NON_FINITE', 'arithmetic produced a non-finite result', {
      pass: 'evaluate',
      plugin: 'arithmetic',
      span: node.span,
      params: { operator: node.op },
    });
  }

  return {
    value: result,
    records: [...left.records, ...right.records],
    segments: [
      ...left.segments,
      ...right.segments,
      { kind: 'math', text: formatNumber(result), result },
    ],
    arithmetic: [
      ...(left.arithmetic ?? []),
      ...(right.arithmetic ?? []),
      {
        expression: `${formatNumber(leftValue)} ${node.op} ${formatNumber(rightValue)}`,
        result,
        nodeType: node.type,
      },
    ],
    warnings: [...(left.warnings ?? []), ...(right.warnings ?? [])],
    ...(left.groups || right.groups
      ? { groups: [...(left.groups ?? []), ...(right.groups ?? [])] }
      : {}),
    ...(left.tables || right.tables
      ? { tables: [...(left.tables ?? []), ...(right.tables ?? [])] }
      : {}),
  };
}

function fn(node: FunctionCallNode, context: EvalContext): EvalResult {
  const name = node.name.toLowerCase();
  if (!MATH_FUNCTIONS.has(name)) {
    fail('MATH_UNKNOWN_FUNCTION', `unknown function "${node.name}"`, {
      pass: 'evaluate',
      plugin: 'arithmetic',
      span: node.span,
      params: { function: node.name },
    });
  }
  const variadic = name === 'min' || name === 'max';
  if (variadic) {
    if (node.args.length === 0) {
      fail('MATH_INVALID_ARITY', `function "${name}" needs an argument`, {
        pass: 'evaluate',
        plugin: 'arithmetic',
        span: node.span,
        params: { function: name, arity: 0 },
      });
    }
    const args = node.args.map((arg) => context.evaluate(arg));
    const values = args.map((arg) => numberValue(arg.value));
    const result = name === 'min' ? Math.min(...values) : Math.max(...values);
    return {
      value: result,
      records: args.flatMap((arg) => arg.records),
      segments: [
        ...args.flatMap((arg) => arg.segments),
        { kind: 'math', text: formatNumber(result), result },
      ],
      arithmetic: [
        ...args.flatMap((arg) => arg.arithmetic ?? []),
        {
          expression: `${name}(${values.map(formatNumber).join(', ')})`,
          result,
          nodeType: node.type,
        },
      ],
      warnings: args.flatMap((arg) => arg.warnings ?? []),
      ...(args.some((arg) => arg.groups)
        ? { groups: args.flatMap((arg) => arg.groups ?? []) }
        : {}),
      ...(args.some((arg) => arg.tables)
        ? { tables: args.flatMap((arg) => arg.tables ?? []) }
        : {}),
    };
  }
  if (node.args.length !== 1) {
    fail(
      'MATH_INVALID_ARITY',
      `function "${name}" expects exactly one argument`,
      {
        pass: 'evaluate',
        plugin: 'arithmetic',
        span: node.span,
        params: { function: name, arity: node.args.length },
      },
    );
  }
  const arg = context.evaluate(node.args[0]);
  const value = numberValue(arg.value);
  const result =
    name === 'floor'
      ? Math.floor(value)
      : name === 'ceil'
        ? Math.ceil(value)
        : name === 'round'
          ? Math.round(value)
          : Math.abs(value);
  return {
    value: result,
    records: arg.records,
    segments: [
      ...arg.segments,
      { kind: 'math', text: formatNumber(result), result },
    ],
    arithmetic: [
      ...(arg.arithmetic ?? []),
      {
        expression: `${name}(${formatNumber(value)})`,
        result,
        nodeType: node.type,
      },
    ],
    warnings: arg.warnings,
    ...(arg.groups ? { groups: arg.groups } : {}),
    ...(arg.tables ? { tables: arg.tables } : {}),
  };
}

export function numberValue(value: number | number[]): number {
  return Array.isArray(value)
    ? value.reduce((total, item) => total + item, 0)
    : value;
}

export function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}
