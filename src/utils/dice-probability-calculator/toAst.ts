import type {
  BinaryOperator,
  CallItem,
  Expression,
  ParamType,
  Program,
  SequenceElement,
  SignaturePart,
  Statement,
  UnaryOperator,
} from './ast';

type CstNode = {
  location?: { startOffset: number };
  [key: string]: any;
};

const binaryOperators: Record<string, BinaryOperator> = {
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '^': '^',
  '=': '=',
  '!=': '!=',
  '<': '<',
  '>': '>',
  '<=': '<=',
  '>=': '>=',
  '&': '&',
  '|': '|',
  '@': '@',
};

function startOffset(node: CstNode | { startOffset?: number }): number {
  return (
    (node as CstNode).location?.startOffset ??
    (node as { startOffset?: number }).startOffset ??
    0
  );
}

function sortByPosition<T extends object>(items: T[]): T[] {
  return [...items].sort((a, b) => startOffset(a) - startOffset(b));
}

/**
 * Chevrotain stores subrules under `node.children`. The AST builder is much
 * easier to read when child keys are available directly, so flatten the tree
 * once before walking it.
 */
function flattenCst(node: CstNode): void {
  if (!node.children) return;
  for (const [key, value] of Object.entries(node.children)) {
    node[key] = value;
    if (Array.isArray(value)) {
      for (const child of value) flattenCst(child);
    } else if (value && typeof value === 'object') {
      flattenCst(value as CstNode);
    }
  }
}

export function buildProgram(ctx: CstNode): Program {
  flattenCst(ctx);
  return {
    statements: (ctx.statement ?? []).map(buildStatement),
  };
}

function buildBlock(ctx: CstNode): Statement[] {
  return (ctx.statement ?? []).map(buildStatement);
}

function buildStatement(ctx: CstNode): Statement {
  if (ctx.functionStatement) {
    const fn = ctx.functionStatement[0];
    return {
      kind: 'function',
      signature: buildSignature(fn.functionSignature[0]),
      body: buildBlock(fn.block[0]),
    };
  }
  if (ctx.outputStatement) {
    const output = ctx.outputStatement[0];
    return {
      kind: 'output',
      value: buildExpression(output.value[0]),
      name: output.outputName
        ? decodeString(output.outputName[0].image)
        : undefined,
    };
  }
  if (ctx.setStatement) {
    const set = ctx.setStatement[0];
    return {
      kind: 'set',
      name: decodeString(set.setting[0].image),
      value: set.stringValue
        ? decodeString(set.stringValue[0].image)
        : buildExpression(set.value[0]),
    };
  }
  if (ctx.loopStatement) {
    const loop = ctx.loopStatement[0];
    return {
      kind: 'loop',
      variable: loop.variable[0].image,
      range: buildExpression(loop.range[0]),
      body: buildBlock(loop.body[0]),
    };
  }
  if (ctx.ifStatement) {
    return buildIf(ctx.ifStatement[0]);
  }
  if (ctx.resultStatement) {
    return {
      kind: 'result',
      value: buildExpression(ctx.resultStatement[0].value[0]),
    };
  }
  if (ctx.assignmentStatement) {
    const assignment = ctx.assignmentStatement[0];
    return {
      kind: 'assignment',
      name: assignment.name[0].image,
      value: buildExpression(assignment.value[0]),
    };
  }
  throw new Error('Unsupported statement');
}

function buildIf(ctx: CstNode): Statement {
  const branches = [
    {
      condition: buildExpression(ctx.condition[0]),
      body: buildBlock(ctx.body[0]),
    },
  ];

  let elseBody: Statement[] | undefined;
  if (ctx.elseIf) {
    const nested = buildIf(ctx.elseIf[0]);
    if (nested.kind !== 'if') throw new Error('Invalid else-if');
    branches.push(...nested.branches);
    elseBody = nested.elseBody;
  } else if (ctx.elseBody) {
    elseBody = buildBlock(ctx.elseBody[0]);
  }

  return { kind: 'if', branches, elseBody };
}

function buildSignature(ctx: CstNode): SignaturePart[] {
  const parts: Array<{ offset: number; part: SignaturePart }> = [];
  for (const token of ctx.word ?? []) {
    parts.push({
      offset: startOffset(token),
      part: { kind: 'word', value: token.image },
    });
  }
  for (const parameter of ctx.param ?? []) {
    const typeImage = parameter.type?.[0]?.image as ParamType | undefined;
    if (typeImage && !['n', 'd', 's'].includes(typeImage)) {
      throw new Error(`Unknown parameter type "${typeImage}"`);
    }
    parts.push({
      offset: startOffset(parameter),
      part: {
        kind: 'param',
        name: parameter.name[0].image,
        type: typeImage ?? null,
      },
    });
  }
  return parts.sort((a, b) => a.offset - b.offset).map(({ part }) => part);
}

function buildExpression(ctx: CstNode): Expression {
  return buildLogicalOr(ctx.logicalOr[0]);
}

function buildLogicalOr(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildLogicalAnd);
}

function buildLogicalAnd(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildComparison);
}

function buildComparison(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildAdditive);
}

function buildAdditive(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildMultiplicative);
}

function buildMultiplicative(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildExponent);
}

function buildExponent(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildAccess);
}

function buildAccess(ctx: CstNode): Expression {
  return buildBinaryRule(ctx, buildDice);
}

function buildBinaryRule(
  ctx: CstNode,
  buildOperand: (node: CstNode) => Expression,
): Expression {
  const operands: CstNode[] = ctx.operand ?? [];
  const operators: Array<{ image: string }> = ctx.operator ?? [];
  if (operands.length === 0) throw new Error('Expression has no operands');

  let result = buildOperand(operands[0]);
  for (let i = 0; i < operators.length; i++) {
    const operator = binaryOperators[operators[i].image];
    if (!operator) {
      throw new Error(`Unknown operator ${operators[i].image}`);
    }
    result = {
      kind: 'binary',
      operator,
      left: result,
      right: buildOperand(operands[i + 1]),
    };
  }
  return result;
}

function buildDice(ctx: CstNode): Expression {
  if (ctx.faces) {
    return {
      kind: 'dice',
      count: ctx.count ? buildUnary(ctx.count[0]) : null,
      faces: buildDiceOperand(ctx.faces[0]),
    };
  }
  return buildUnary(ctx.count[0]);
}

function buildDiceOperand(ctx: CstNode): Expression | 'percent' {
  if (ctx.percent) return 'percent';
  return buildUnary(ctx.value[0]);
}

function buildUnary(ctx: CstNode): Expression {
  const unaryOperators: Array<[string, UnaryOperator]> = [
    ['Plus', '+'],
    ['Minus', '-'],
    ['Not', '!'],
    ['Hash', '#'],
  ];
  for (const [tokenName, operator] of unaryOperators) {
    if (ctx[tokenName]) {
      const operand = ctx.unary
        ? ctx.unary[0]
        : ctx.term
          ? ctx.term[0]
          : undefined;
      if (!operand) throw new Error('Unary operator without operand');
      return {
        kind: 'unary',
        operator,
        operand: buildUnary(operand),
      };
    }
  }
  return buildTerm(ctx.term[0]);
}

function buildTerm(ctx: CstNode): Expression {
  if (ctx.number) {
    return { kind: 'number', value: Number(ctx.number[0].image) };
  }
  if (ctx.variable) {
    return { kind: 'variable', name: ctx.variable[0].image };
  }
  if (ctx.call) return buildCall(ctx.call[0]);
  if (ctx.sequence) return buildSequence(ctx.sequence[0]);
  if (ctx.group) {
    return buildExpression(ctx.group[0].expression[0]);
  }
  throw new Error('Unsupported term');
}

function buildCall(ctx: CstNode): Expression {
  const items: Array<{ offset: number; item: CallItem }> = [];
  for (const token of ctx.word ?? []) {
    items.push({
      offset: startOffset(token),
      item: { kind: 'word', value: token.image },
    });
  }
  for (const argument of ctx.argument ?? []) {
    items.push({
      offset: startOffset(argument),
      item: { kind: 'expression', value: buildExpression(argument) },
    });
  }
  return {
    kind: 'call',
    items: items.sort((a, b) => a.offset - b.offset).map(({ item }) => item),
  };
}

function buildSequence(ctx: CstNode): Expression {
  const elements: SequenceElement[] = (ctx.element ?? []).map(
    (element: CstNode) => ({
      value: buildExpression(element.value[0]),
      rangeEnd: element.rangeEnd
        ? buildExpression(element.rangeEnd[0])
        : undefined,
      repeat: element.repeat ? buildExpression(element.repeat[0]) : undefined,
    }),
  );
  return { kind: 'sequence', elements };
}

function decodeString(image: string): string {
  const body = image.slice(1, -1);
  return body.replace(/\\(["\\])/g, '$1');
}
