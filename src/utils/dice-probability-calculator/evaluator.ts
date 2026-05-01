// interpreter.ts – final version with all standard functions in the prelude

import { DiceParser } from './parser';
import { lex } from './lexer';

// ============================================================================
// Data Types
// ============================================================================

type Value = number | Die | Sequence;

class Sequence {
  readonly elements: number[];
  constructor(elements: number[]) {
    this.elements = [...elements];
  }
  get length(): number {
    return this.elements.length;
  }
  get(index: number): number {
    return this.elements[index - 1] ?? 0;
  } // 1‑indexed
  sum(): number {
    return this.elements.reduce((a, b) => a + b, 0);
  }
  contains(n: number): boolean {
    return this.elements.includes(n);
  }
  count(values: number[]): number {
    return this.elements.filter((e) => values.includes(e)).length;
  }
  sortDesc(): Sequence {
    return new Sequence([...this.elements].sort((a, b) => b - a));
  }
  sortAsc(): Sequence {
    return new Sequence([...this.elements].sort((a, b) => a - b));
  }
  reverse(): Sequence {
    return new Sequence([...this.elements].reverse());
  }
  toString(): string {
    return `{${this.elements.join(', ')}}`;
  }
}

class Die {
  readonly weights: Map<number, bigint>;
  readonly totalWeight: bigint;
  readonly min: number;
  readonly max: number;

  // Metadata for homogeneous pools (used by @ operator optimisations)
  public __poolCount?: number;
  public __poolSides?: number;

  constructor(weights: Map<number, bigint>) {
    this.weights = new Map(weights);
    this.totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0n);
    let min = Infinity,
      max = -Infinity;
    for (const k of this.weights.keys()) {
      if (k < min) min = k;
      if (k > max) max = k;
    }
    this.min = min === Infinity ? 0 : min;
    this.max = max === -Infinity ? 0 : max;
  }

  static fromConstant(value: number): Die {
    return new Die(new Map([[value, 1n]]));
  }

  static fromSequence(seq: Sequence): Die {
    const weights = new Map<number, bigint>();
    for (const v of seq.elements) {
      weights.set(v, (weights.get(v) ?? 0n) + 1n);
    }
    return new Die(weights);
  }

  // Basic arithmetic
  add(other: Die | number): Die {
    if (typeof other === 'number') {
      const result = new Map<number, bigint>();
      for (const [v, w] of this.weights) {
        result.set(v + other, w);
      }
      return new Die(result);
    }
    const result = new Map<number, bigint>();
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        const sum = a + b;
        result.set(sum, (result.get(sum) ?? 0n) + wa * wb);
      }
    }
    return new Die(result);
  }

  sub(other: Die | number): Die {
    if (typeof other === 'number') return this.add(-other);
    const result = new Map<number, bigint>();
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        const diff = a - b;
        result.set(diff, (result.get(diff) ?? 0n) + wa * wb);
      }
    }
    return new Die(result);
  }

  mul(other: Die | number): Die {
    if (typeof other === 'number') {
      const result = new Map<number, bigint>();
      for (const [v, w] of this.weights) {
        result.set(v * other, w);
      }
      return new Die(result);
    }
    const result = new Map<number, bigint>();
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        const prod = a * b;
        result.set(prod, (result.get(prod) ?? 0n) + wa * wb);
      }
    }
    return new Die(result);
  }

  div(other: number): Die {
    const result = new Map<number, bigint>();
    for (const [v, w] of this.weights) {
      const q = v >= 0 ? Math.floor(v / other) : Math.ceil(v / other);
      result.set(q, (result.get(q) ?? 0n) + w);
    }
    return new Die(result);
  }

  pow(exponent: number): Die {
    if (exponent < 0) throw new Error('Negative exponent not supported');
    let result = Die.fromConstant(1);
    for (let i = 0; i < exponent; i++) {
      result = result.mul(this);
    }
    return result;
  }

  // Comparisons
  compare(op: string, other: Die | number): Die {
    const truth = new Map<number, bigint>();
    if (typeof other === 'number') {
      for (const [v, w] of this.weights) {
        let cond = false;
        if (op === '==') cond = v === other;
        else if (op === '!=') cond = v !== other;
        else if (op === '<') cond = v < other;
        else if (op === '>') cond = v > other;
        else if (op === '<=') cond = v <= other;
        else if (op === '>=') cond = v >= other;
        truth.set(cond ? 1 : 0, (truth.get(cond ? 1 : 0) ?? 0n) + w);
      }
    } else {
      for (const [a, wa] of this.weights) {
        for (const [b, wb] of other.weights) {
          let cond = false;
          if (op === '==') cond = a === b;
          else if (op === '!=') cond = a !== b;
          else if (op === '<') cond = a < b;
          else if (op === '>') cond = a > b;
          else if (op === '<=') cond = a <= b;
          else if (op === '>=') cond = a >= b;
          truth.set(cond ? 1 : 0, (truth.get(cond ? 1 : 0) ?? 0n) + wa * wb);
        }
      }
    }
    return new Die(truth);
  }

  // Boolean operators
  logicalNot(): Die {
    let zeroWeight = 0n,
      nonZeroWeight = 0n;
    for (const [v, w] of this.weights) {
      if (v === 0) zeroWeight += w;
      else nonZeroWeight += w;
    }
    return new Die(
      new Map([
        [1, zeroWeight],
        [0, nonZeroWeight],
      ]),
    );
  }

  logicalAnd(other: Die): Die {
    const result = new Map<number, bigint>();
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        const val = a !== 0 && b !== 0 ? 1 : 0;
        result.set(val, (result.get(val) ?? 0n) + wa * wb);
      }
    }
    return new Die(result);
  }

  logicalOr(other: Die): Die {
    const result = new Map<number, bigint>();
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        const val = a !== 0 || b !== 0 ? 1 : 0;
        result.set(val, (result.get(val) ?? 0n) + wa * wb);
      }
    }
    return new Die(result);
  }

  // Order statistics (@ operator)
  select(
    selection: number | Sequence,
    positionOrder: 'highest first' | 'lowest first',
  ): Die {
    const poolSize = this.__poolCount ?? 1;
    const faces = Array.from(this.weights.keys()).sort((a, b) => a - b);
    const isUniform = this.isUniform();

    if (isUniform && this.__poolSides) {
      return this.selectUniform(
        poolSize,
        this.__poolSides,
        selection,
        positionOrder,
      );
    } else {
      return this.selectGeneric(poolSize, faces, selection, positionOrder);
    }
  }

  private isUniform(): boolean {
    if (this.weights.size === 0) return false;
    const firstWeight = this.weights.values().next().value;
    for (const w of this.weights.values()) {
      if (w !== firstWeight) return false;
    }
    return true;
  }

  private selectUniform(
    n: number,
    sides: number,
    selection: number | Sequence,
    order: 'highest first' | 'lowest first',
  ): Die {
    const result = new Map<number, bigint>();
    const faces = Array.from({ length: sides }, (_, i) => i + 1);
    const counts = new Array(faces.length).fill(0);
    const indices: number[] =
      typeof selection === 'number' ? [selection] : selection.elements;
    const zeroIndices = indices
      .map((i) => i - 1)
      .filter((i) => i >= 0 && i < n);
    if (zeroIndices.length === 0) return Die.fromConstant(0);

    const recurse = (faceIdx: number, remaining: number, weight: bigint) => {
      if (remaining === 0) {
        const rolls: number[] = [];
        for (let i = 0; i < faces.length; i++) {
          for (let j = 0; j < counts[i]; j++) rolls.push(faces[i]);
        }
        if (order === 'highest first') rolls.sort((a, b) => b - a);
        else rolls.sort((a, b) => a - b);
        let sum = 0;
        for (const idx of zeroIndices) {
          if (idx < rolls.length) sum += rolls[idx];
        }
        result.set(sum, (result.get(sum) ?? 0n) + weight);
        return;
      }
      if (faceIdx === faces.length) return;
      const maxTake = remaining;
      for (let take = 0; take <= maxTake; take++) {
        const ways = this.binomial(remaining, take);
        counts[faceIdx] = take;
        recurse(faceIdx + 1, remaining - take, weight * BigInt(ways));
      }
    };
    recurse(0, n, 1n);
    return new Die(result);
  }

  private selectGeneric(
    n: number,
    faces: number[],
    selection: number | Sequence,
    order: 'highest first' | 'lowest first',
  ): Die {
    const result = new Map<number, bigint>();
    const counts = new Array(faces.length).fill(0);
    const indices: number[] =
      typeof selection === 'number' ? [selection] : selection.elements;
    const zeroIndices = indices
      .map((i) => i - 1)
      .filter((i) => i >= 0 && i < n);
    if (zeroIndices.length === 0) return Die.fromConstant(0);

    const recurse = (faceIdx: number, remaining: number, weight: bigint) => {
      if (remaining === 0) {
        const rolls: number[] = [];
        for (let i = 0; i < faces.length; i++) {
          for (let j = 0; j < counts[i]; j++) rolls.push(faces[i]);
        }
        if (order === 'highest first') rolls.sort((a, b) => b - a);
        else rolls.sort((a, b) => a - b);
        let sum = 0;
        for (const idx of zeroIndices) {
          if (idx < rolls.length) sum += rolls[idx];
        }
        result.set(sum, (result.get(sum) ?? 0n) + weight);
        return;
      }
      if (faceIdx === faces.length) return;
      const maxTake = remaining;
      for (let take = 0; take <= maxTake; take++) {
        const ways = this.binomial(remaining, take);
        counts[faceIdx] = take;
        recurse(faceIdx + 1, remaining - take, weight * BigInt(ways));
      }
    };
    recurse(0, n, 1n);
    return new Die(result);
  }

  private binomial(n: number, k: number): bigint {
    if (k < 0 || k > n) return 0n;
    if (k === 0 || k === n) return 1n;
    let res = 1n;
    let kk = Math.min(k, n - k);
    for (let i = 1; i <= kk; i++) {
      res = (res * BigInt(n - kk + i)) / BigInt(i);
    }
    return res;
  }
}

// ============================================================================
// Global Settings
// ============================================================================

interface Settings {
  maxFunctionDepth: number;
  explodeDepth: number;
  positionOrder: 'highest first' | 'lowest first';
}

const defaultSettings: Settings = {
  maxFunctionDepth: 10,
  explodeDepth: 8,
  positionOrder: 'highest first',
};

// ============================================================================
// Environment
// ============================================================================

type FunctionDef = {
  params: { name: string; type: 'n' | 'd' | 's' }[];
  body: any;
  closure: Environment;
};

class Environment {
  private parent: Environment | null;
  private variables: Map<string, Value>;
  private functions: Map<string, FunctionDef>;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
    this.variables = new Map();
    this.functions = new Map();
  }

  getVariable(name: string): Value | undefined {
    const val = this.variables.get(name);
    if (val !== undefined) return val;
    if (this.parent) return this.parent.getVariable(name);
    return undefined;
  }

  setVariable(name: string, value: Value): void {
    if (this.variables.has(name) || this.parent === null) {
      this.variables.set(name, value);
    } else {
      if (this.parent.getVariable(name) !== undefined) {
        this.parent.setVariable(name, value);
      } else {
        this.variables.set(name, value);
      }
    }
  }

  declareVariable(name: string, value: Value): void {
    this.variables.set(name, value);
  }

  getFunction(name: string): FunctionDef | undefined {
    const fn = this.functions.get(name);
    if (fn) return fn;
    if (this.parent) return this.parent.getFunction(name);
    return undefined;
  }

  setFunction(name: string, def: FunctionDef): void {
    this.functions.set(name, def);
  }

  push(): Environment {
    return new Environment(this);
  }
}

// ============================================================================
// Global Cache (memoization for expensive operations – not used for explode now)
// ============================================================================

const globalCache = new Map<string, Die>();

function makeKey(operation: string, ...args: any[]): string {
  return `${operation}(${args
    .map((a) => {
      if (a instanceof Die) {
        const sorted = Array.from(a.weights.entries()).sort(
          ([x], [y]) => x - y,
        );
        return `Die(${JSON.stringify(sorted)})`;
      }
      if (a instanceof Sequence) return `Seq(${a.elements.join(',')})`;
      return String(a);
    })
    .join(',')})`;
}

// ============================================================================
// Prelude Script (standard AnyDice functions, including explode)
// ============================================================================

const PRELUDE = `
\\ Prelude: Standard AnyDice function library \\

function: highest of A and B {
  if A > B { result: A }
  result: B
}

function: lowest of A and B {
  if A < B { result: A }
  result: B
}

function: maximum of DIE {
  result: 1@DIE
}

function: absolute N {
  if N < 0 { result: -N }
  result: N
}

function: contains VALUE in SEQ {
  result: (SEQ = VALUE) > 0
}

function: count VALUES in SEQ {
  RESULT: 0
  loop I over SEQ {
    if VALUES = I { RESULT: RESULT + 1 }
  }
  result: RESULT
}

function: highest NUMBER of DICE {
  result: {1..NUMBER}@DICE
}

function: lowest NUMBER of DICE {
  result: {(#DICE - NUMBER + 1) .. #DICE}@DICE
}

function: middle NUMBER of DICE {
  START: (#DICE - NUMBER) / 2 + 1
  END: START + NUMBER - 1
  result: {START..END}@DICE
}

function: reverse SEQUENCE:s {
  R: {}
  loop P over {1..#SEQUENCE} {
    R: {P@SEQUENCE, R}
  }
  result: R
}

function: sort SEQUENCE:s {
  SORTED: {}
  loop P over {2..#SEQUENCE} {
    SORTED: [sort helper add P@SEQUENCE to SORTED]
  }
  result: SORTED
}

function: sort helper add N:n to S:s {
  if #S = 0 { result: {N} }
  if N >= 1@S { result: {N, S} }
  if N <= (#S)@S { result: {S, N} }
  R: {}
  loop P over {1..#S} {
    if N >= P@S {
      R: {R, N, P@S}
      N: {}
    }
    else { R: {R, P@S} }
  }
  if #N { R: {R, N} }
  result: R
}

\\ Explode – implemented recursively, depth limited by maximum function depth \\
function: explode DIE:d {
  MAX: [maximum of DIE]
  result: [explode DIE with max MAX]
}

function: explode DIE:n with max MAX:n {
  if DIE = MAX { result: DIE + [explode DIE with max MAX] }
  result: DIE
}
`;

// ============================================================================
// CST Visitor
// ============================================================================

class InterpreterVisitor {
  private settings: Settings = { ...defaultSettings };
  private outputs: { expr: Value; name?: string }[] = [];
  private resultValue: Value | null = null;

  evaluate(script: string): {
    outputs: { expr: Value; name?: string }[];
    settings: Settings;
  } {
    // 1. Evaluate prelude
    const preludeTokens = lex(PRELUDE);
    const preludeParser = new DiceParser(preludeTokens);
    preludeParser.program();
    if (preludeParser.errors.length) {
      throw new Error(
        `Prelude parsing errors: ${preludeParser.errors.map((e) => e.message).join(', ')}`,
      );
    }
    const preludeCst = preludeParser.program();
    const env = new Environment();
    this.visitProgram(preludeCst, env);

    // 2. Evaluate user script
    const userTokens = lex(script);
    const userParser = new DiceParser(userTokens);
    userParser.program();
    if (userParser.errors.length) {
      throw new Error(
        `Parsing errors: ${userParser.errors.map((e) => e.message).join(', ')}`,
      );
    }
    const userCst = userParser.program();
    this.visitProgram(userCst, env);

    return { outputs: this.outputs, settings: this.settings };
  }

  private visitProgram(ctx: any, env: Environment): void {
    if (ctx.statements) {
      for (const stmt of ctx.statements) {
        this.visitStatement(stmt, env);
      }
    }
  }

  private visitStatement(ctx: any, env: Environment): void {
    if (ctx.variableAssignment) {
      this.visitVariableAssignment(ctx.variableAssignment[0], env);
    } else if (ctx.outputStatement) {
      this.visitOutputStatement(ctx.outputStatement[0], env);
    } else if (ctx.functionDefinition) {
      this.visitFunctionDefinition(ctx.functionDefinition[0], env);
    } else if (ctx.setDirective) {
      this.visitSetDirective(ctx.setDirective[0], env);
    } else if (ctx.ifStatement) {
      this.visitIfStatement(ctx.ifStatement[0], env);
    } else if (ctx.loopStatement) {
      this.visitLoopStatement(ctx.loopStatement[0], env);
    } else if (ctx.resultStatement) {
      this.visitResultStatement(ctx.resultStatement[0], env);
    }
  }

  private visitVariableAssignment(ctx: any, env: Environment): void {
    const name = ctx.name[0].image;
    const value = this.visitExpression(ctx.value[0], env);
    env.declareVariable(name, value);
  }

  private visitOutputStatement(ctx: any, env: Environment): void {
    const expr = this.visitExpression(ctx.expr[0], env);
    let name: string | undefined;
    if (ctx.name) {
      name = ctx.name[0].image.slice(1, -1);
      name = name.replace(/\[([A-Z_][A-Z0-9_]*)\]/g, (_, varName) => {
        const val = env.getVariable(varName);
        return val !== undefined ? String(val) : '';
      });
    }
    this.outputs.push({ expr, name });
  }

  private visitFunctionDefinition(ctx: any, env: Environment): void {
    const name = ctx.name[0].image;
    const params: { name: string; type: 'n' | 'd' | 's' }[] = [];
    if (ctx.parameterList && ctx.parameterList[0]) {
      const paramCtx = ctx.parameterList[0];
      if (paramCtx.first) {
        const first = paramCtx.first[0];
        const paramName = first.name[0].image;
        const type = first.type[0].image as 'n' | 'd' | 's';
        params.push({ name: paramName, type });
      }
      if (paramCtx.next) {
        for (const next of paramCtx.next) {
          const paramName = next.name[0].image;
          const type = next.type[0].image as 'n' | 'd' | 's';
          params.push({ name: paramName, type });
        }
      }
    }
    const fnDef: FunctionDef = {
      params,
      body: ctx,
      closure: env,
    };
    env.setFunction(name, fnDef);
  }

  private visitSetDirective(ctx: any, env: Environment): void {
    const setting = ctx.setting[0].image.slice(1, -1);
    const val = this.visitExpression(ctx.value[0], env);
    let num: number;
    if (typeof val === 'number') num = val;
    else throw new Error(`set directive expects number, got ${val}`);
    switch (setting) {
      case 'maximum function depth':
        this.settings.maxFunctionDepth = num;
        break;
      case 'explode depth':
        this.settings.explodeDepth = num;
        break;
      case 'position order':
        this.settings.positionOrder =
          num === 0 ? 'lowest first' : 'highest first';
        break;
      default:
        throw new Error(`Unknown setting: ${setting}`);
    }
  }

  private visitIfStatement(ctx: any, env: Environment): void {
    const cond = this.visitExpression(ctx.condition[0], env);
    const condVal = this.asNumber(cond);
    if (condVal !== 0) {
      this.visitBlock(ctx.thenBlock[0], env);
    } else if (ctx.elseBlock) {
      this.visitBlock(ctx.elseBlock[0], env);
    }
  }

  private visitLoopStatement(ctx: any, env: Environment): void {
    const varName = ctx.var[0].image;
    const range = this.visitExpression(ctx.range[0], env);
    let seq: Sequence;
    if (range instanceof Sequence) seq = range;
    else if (typeof range === 'number') seq = new Sequence([range]);
    else throw new Error('loop range must be sequence or number');
    for (const val of seq.elements) {
      const loopEnv = env.push();
      loopEnv.declareVariable(varName, val);
      this.visitBlock(ctx.body[0], loopEnv);
    }
  }

  private visitResultStatement(ctx: any, env: Environment): void {
    const value = this.visitExpression(ctx.value[0], env);
    this.resultValue = value;
  }

  private visitBlock(ctx: any, env: Environment): void {
    if (ctx.statement) {
      for (const stmt of ctx.statement) {
        this.visitStatement(stmt, env);
        if (this.resultValue !== null) return;
      }
    }
  }

  // Expression rules
  private visitExpression(ctx: any, env: Environment): Value {
    return this.visitLogicalOrExpression(ctx, env);
  }

  private visitLogicalOrExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitLogicalAndExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const rhs = this.visitLogicalAndExpression(ctx.rhs[i], env);
        lhs = this.binaryLogicalOr(lhs, rhs);
      }
    }
    return lhs;
  }

  private visitLogicalAndExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitComparisonExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const rhs = this.visitComparisonExpression(ctx.rhs[i], env);
        lhs = this.binaryLogicalAnd(lhs, rhs);
      }
    }
    return lhs;
  }

  private visitComparisonExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitAdditiveExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      const opToken =
        ctx.Equal?.[0] ||
        ctx.NotEqual?.[0] ||
        ctx.LessThan?.[0] ||
        ctx.GreaterThan?.[0] ||
        ctx.LessEqual?.[0] ||
        ctx.GreaterEqual?.[0];
      const op = opToken.image;
      const rhs = this.visitAdditiveExpression(ctx.rhs[0], env);
      lhs = this.binaryCompare(op, lhs, rhs);
    }
    return lhs;
  }

  private visitAdditiveExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitMultiplicativeExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const op = ctx.Plus?.[i] ? '+' : '-';
        const rhs = this.visitMultiplicativeExpression(ctx.rhs[i], env);
        lhs = this.binaryAddSub(op, lhs, rhs);
      }
    }
    return lhs;
  }

  private visitMultiplicativeExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitExponentiationExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const op = ctx.Star?.[i] ? '*' : '/';
        const rhs = this.visitExponentiationExpression(ctx.rhs[i], env);
        lhs = this.binaryMulDiv(op, lhs, rhs);
      }
    }
    return lhs;
  }

  private visitExponentiationExpression(ctx: any, env: Environment): Value {
    let lhs = this.visitUnaryExpression(ctx.lhs[0], env);
    if (ctx.rhs) {
      const rhs = this.visitUnaryExpression(ctx.rhs[0], env);
      lhs = this.binaryPow(lhs, rhs);
    }
    return lhs;
  }

  private visitUnaryExpression(ctx: any, env: Environment): Value {
    if (ctx.primaryExpression) {
      return this.visitPrimaryExpression(ctx.primaryExpression[0], env);
    } else if (ctx.Not) {
      const operand = this.visitUnaryExpression(ctx.operand[0], env);
      return this.unaryNot(operand);
    } else if (ctx.Hash) {
      const operand = this.visitUnaryExpression(ctx.operand[0], env);
      return this.unaryHash(operand);
    } else if (ctx.Minus) {
      const operand = this.visitUnaryExpression(ctx.operand[0], env);
      return this.unaryMinus(operand);
    }
    throw new Error('Unknown unary expression');
  }

  private visitPrimaryExpression(ctx: any, env: Environment): Value {
    if (ctx.number) {
      return parseInt(ctx.number[0].image, 10);
    } else if (ctx.diceExpression) {
      return this.visitDiceExpression(ctx.diceExpression[0], env);
    } else if (ctx.variable) {
      const name = ctx.variable[0].image;
      const val = env.getVariable(name);
      if (val === undefined) throw new Error(`Undefined variable: ${name}`);
      return val;
    } else if (ctx.functionInvocation) {
      return this.visitFunctionInvocation(ctx.functionInvocation[0], env);
    } else if (ctx.sequenceLiteral) {
      return this.visitSequenceLiteral(ctx.sequenceLiteral[0], env);
    } else if (ctx.parenthesizedExpression) {
      return this.visitExpression(
        ctx.parenthesizedExpression[0].expression[0],
        env,
      );
    }
    throw new Error('Unknown primary expression');
  }

  private visitDiceExpression(ctx: any, env: Environment): Die {
    let count = 1;
    if (ctx.count) {
      count = parseInt(ctx.count[0].image, 10);
    }
    let singleDie: Die;
    if (ctx.percent) {
      singleDie = this.makeUniformDie(100);
    } else if (ctx.sides) {
      const sides = parseInt(ctx.sides[0].image, 10);
      singleDie = this.makeUniformDie(sides);
    } else if (ctx.sequence) {
      const seq = this.visitSequenceLiteral(ctx.sequence[0], env);
      singleDie = Die.fromSequence(seq);
    } else if (ctx.expr) {
      const exprValue = this.visitExpression(ctx.expr[0], env);
      if (exprValue instanceof Die) {
        singleDie = exprValue;
      } else if (exprValue instanceof Sequence) {
        singleDie = Die.fromSequence(exprValue);
      } else if (typeof exprValue === 'number') {
        singleDie = Die.fromConstant(exprValue);
      } else {
        throw new Error('Invalid expression inside dice parentheses');
      }
    } else {
      throw new Error('Invalid dice expression');
    }
    let result = Die.fromConstant(0);
    for (let i = 0; i < count; i++) {
      result = result.add(singleDie);
    }
    // Attach metadata for homogeneous pools
    if (count > 1 && this.isUniformDie(singleDie)) {
      result.__poolCount = count;
      result.__poolSides = singleDie.weights.size;
    } else if (count === 1 && this.isUniformDie(singleDie)) {
      result.__poolCount = 1;
      result.__poolSides = singleDie.weights.size;
    }
    return result;
  }

  private makeUniformDie(sides: number): Die {
    const weights = new Map<number, bigint>();
    for (let i = 1; i <= sides; i++) {
      weights.set(i, 1n);
    }
    return new Die(weights);
  }

  private isUniformDie(die: Die): boolean {
    if (die.weights.size === 0) return false;
    const expected = die.weights.values().next().value;
    for (const w of die.weights.values()) {
      if (w !== expected) return false;
    }
    return true;
  }

  private visitFunctionInvocation(ctx: any, env: Environment): Value {
    const name = ctx.name[0].image;
    const args: Value[] = [];
    if (ctx.args) {
      for (const argCtx of ctx.args) {
        args.push(this.visitExpression(argCtx, env));
      }
    }
    // No hard‑coded primitives – everything is defined in the prelude.
    const fnDef = env.getFunction(name);
    if (!fnDef) throw new Error(`Undefined function: ${name}`);
    return this.evaluateUserFunction(fnDef, args, env);
  }

  private evaluateUserFunction(
    fnDef: FunctionDef,
    args: Value[],
    callerEnv: Environment,
  ): Value {
    // Coerce arguments
    const coercedArgs: Value[] = [];
    for (let i = 0; i < fnDef.params.length; i++) {
      const param = fnDef.params[i];
      const arg = args[i];
      if (arg === undefined)
        throw new Error(`Missing argument for ${param.name}`);
      coercedArgs.push(this.coerceArgument(arg, param.type));
    }
    // Check if any argument is a die that needs expansion (type n or s)
    const needsExpansion = fnDef.params.some((param, idx) => {
      const arg = coercedArgs[idx];
      return arg instanceof Die && param.type !== 'd';
    });
    if (needsExpansion) {
      // Cartesian product expansion
      const expandedIndices: number[] = [];
      const expandedDice: Die[] = [];
      const expandedIsSeqParam: boolean[] = [];
      const fixedArgs: (number | Sequence)[] = [];
      for (let i = 0; i < fnDef.params.length; i++) {
        const arg = coercedArgs[i];
        const paramType = fnDef.params[i].type;
        if (arg instanceof Die && paramType !== 'd') {
          expandedIndices.push(i);
          expandedDice.push(arg);
          expandedIsSeqParam.push(paramType === 's');
          fixedArgs.push(0 as any);
        } else {
          fixedArgs.push(arg as number | Sequence);
        }
      }
      const resultWeights = new Map<number, bigint>();
      const recurse = (
        depth: number,
        currentValues: number[],
        currentWeight: bigint,
        currentSeqs: Sequence[],
      ) => {
        if (depth === expandedDice.length) {
          const callArgs: Value[] = [];
          let vi = 0,
            si = 0;
          for (let i = 0; i < fnDef.params.length; i++) {
            if (expandedIndices.includes(i)) {
              const idx = expandedIndices.indexOf(i);
              if (expandedIsSeqParam[idx]) {
                callArgs.push(currentSeqs[si++]);
              } else {
                callArgs.push(currentValues[vi++]);
              }
            } else {
              callArgs.push(fixedArgs[i]);
            }
          }
          const subEnv = fnDef.closure.push();
          for (let i = 0; i < fnDef.params.length; i++) {
            subEnv.declareVariable(fnDef.params[i].name, callArgs[i]);
          }
          this.resultValue = null;
          this.visitBlock(fnDef.body, subEnv);
          const result = this.resultValue ?? new Die(new Map());
          if (result instanceof Die) {
            for (const [v, w] of result.weights) {
              resultWeights.set(
                v,
                (resultWeights.get(v) ?? 0n) + currentWeight * w,
              );
            }
          } else if (typeof result === 'number') {
            resultWeights.set(
              result,
              (resultWeights.get(result) ?? 0n) + currentWeight,
            );
          } else if (result instanceof Sequence) {
            const seqDie = Die.fromSequence(result);
            for (const [v, w] of seqDie.weights) {
              resultWeights.set(
                v,
                (resultWeights.get(v) ?? 0n) + currentWeight * w,
              );
            }
          }
          return;
        }
        const die = expandedDice[depth];
        const isSeq = expandedIsSeqParam[depth];
        if (isSeq) {
          const poolSize = die.__poolCount ?? 1;
          if (poolSize > 8)
            throw new Error(
              `Sequence expansion for ${poolSize} dice too large`,
            );
          const faces = Array.from(die.weights.keys()).sort((a, b) => a - b);
          const sequences = this.generateAllSortedSequences(poolSize, faces);
          for (const seq of sequences) {
            const weight = this.multinomialWeight(seq, die);
            recurse(depth + 1, currentValues, currentWeight * weight, [
              ...currentSeqs,
              seq,
            ]);
          }
        } else {
          for (const [val, w] of die.weights) {
            recurse(
              depth + 1,
              [...currentValues, val],
              currentWeight * w,
              currentSeqs,
            );
          }
        }
      };
      recurse(0, [], 1n, []);
      return new Die(resultWeights);
    } else {
      const subEnv = fnDef.closure.push();
      for (let i = 0; i < fnDef.params.length; i++) {
        subEnv.declareVariable(fnDef.params[i].name, coercedArgs[i]);
      }
      this.resultValue = null;
      this.visitBlock(fnDef.body, subEnv);
      return this.resultValue ?? new Die(new Map());
    }
  }

  private generateAllSortedSequences(n: number, faces: number[]): Sequence[] {
    const results: Sequence[] = [];
    const counts = new Array(faces.length).fill(0);
    const recurse = (faceIdx: number, remaining: number) => {
      if (remaining === 0) {
        const elems: number[] = [];
        for (let i = 0; i < faces.length; i++) {
          for (let j = 0; j < counts[i]; j++) elems.push(faces[i]);
        }
        results.push(new Sequence(elems));
        return;
      }
      if (faceIdx === faces.length) return;
      for (let take = 0; take <= remaining; take++) {
        counts[faceIdx] = take;
        recurse(faceIdx + 1, remaining - take);
      }
    };
    recurse(0, n);
    return results;
  }

  private multinomialWeight(seq: Sequence, die: Die): bigint {
    const counts = new Map<number, number>();
    for (const v of seq.elements) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let weight = 1n;
    for (const [v, cnt] of counts) {
      const faceWeight = die.weights.get(v) ?? 0n;
      for (let i = 1; i <= cnt; i++) {
        weight = (weight * faceWeight) / BigInt(i);
      }
    }
    const total = seq.elements.length;
    let fact = 1n;
    for (let i = 2; i <= total; i++) fact *= BigInt(i);
    weight = weight * fact;
    return weight;
  }

  private coerceArgument(arg: Value, expectedType: 'n' | 'd' | 's'): Value {
    if (expectedType === 'n') {
      if (typeof arg === 'number') return arg;
      if (arg instanceof Die) return arg; // will be expanded
      if (arg instanceof Sequence) return arg.sum();
    } else if (expectedType === 'd') {
      if (typeof arg === 'number') return Die.fromConstant(arg);
      if (arg instanceof Die) return arg;
      if (arg instanceof Sequence) return Die.fromSequence(arg);
    } else if (expectedType === 's') {
      if (typeof arg === 'number') return new Sequence([arg]);
      if (arg instanceof Die) return arg; // will be expanded
      if (arg instanceof Sequence) return arg;
    }
    throw new Error(`Cannot coerce ${arg} to type ${expectedType}`);
  }

  private visitSequenceLiteral(ctx: any, env: Environment): Sequence {
    const elements: number[] = [];
    const elementsCtx = ctx.sequenceElements[0];
    if (elementsCtx.sequenceElement) {
      for (const elem of elementsCtx.sequenceElement) {
        if (elem.expression) {
          const val = this.visitExpression(elem.expression[0], env);
          elements.push(this.asNumber(val));
        } else if (elem.value && elem.count) {
          const val = this.visitExpression(elem.value[0], env);
          const count = this.visitExpression(elem.count[0], env);
          const numVal = this.asNumber(val);
          const numCount = this.asNumber(count);
          for (let i = 0; i < numCount; i++) elements.push(numVal);
        } else if (elem.dieToSeq) {
          const die = this.visitDiceExpression(elem.dieToSeq[0], env);
          const outcomes = Array.from(die.weights.keys()).sort((a, b) => a - b);
          for (const o of outcomes) elements.push(o);
        }
      }
    }
    if (this.settings.positionOrder === 'highest first') {
      elements.sort((a, b) => b - a);
    } else {
      elements.sort((a, b) => a - b);
    }
    return new Sequence(elements);
  }

  // Binary/unary helpers
  private binaryAddSub(op: string, lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die || rhs instanceof Die) {
      const left =
        lhs instanceof Die ? lhs : Die.fromConstant(this.asNumber(lhs));
      const right =
        rhs instanceof Die ? rhs : Die.fromConstant(this.asNumber(rhs));
      return op === '+' ? left.add(right) : left.sub(right);
    }
    if (lhs instanceof Sequence || rhs instanceof Sequence) {
      let seq: Sequence, num: number;
      if (lhs instanceof Sequence && typeof rhs === 'number') {
        seq = lhs;
        num = rhs;
        const newElems = [...seq.elements, num];
        if (this.settings.positionOrder === 'highest first')
          newElems.sort((a, b) => b - a);
        else newElems.sort((a, b) => a - b);
        return new Sequence(newElems);
      }
      if (typeof lhs === 'number' && rhs instanceof Sequence) {
        seq = rhs;
        num = lhs;
        const newElems = [num, ...seq.elements];
        if (this.settings.positionOrder === 'highest first')
          newElems.sort((a, b) => b - a);
        else newElems.sort((a, b) => a - b);
        return new Sequence(newElems);
      }
      if (lhs instanceof Sequence && rhs instanceof Sequence) {
        const newElems = [...lhs.elements, ...rhs.elements];
        if (this.settings.positionOrder === 'highest first')
          newElems.sort((a, b) => b - a);
        else newElems.sort((a, b) => a - b);
        return new Sequence(newElems);
      }
    }
    const a = this.asNumber(lhs);
    const b = this.asNumber(rhs);
    return op === '+' ? a + b : a - b;
  }

  private binaryMulDiv(op: string, lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die || rhs instanceof Die) {
      const left =
        lhs instanceof Die ? lhs : Die.fromConstant(this.asNumber(lhs));
      if (op === '*') {
        if (typeof rhs === 'number') return left.mul(rhs);
        const right =
          rhs instanceof Die ? rhs : Die.fromConstant(this.asNumber(rhs));
        return left.mul(right);
      } else {
        const divisor = this.asNumber(rhs);
        return left.div(divisor);
      }
    }
    const a = this.asNumber(lhs);
    const b = this.asNumber(rhs);
    if (op === '*') return a * b;
    else return Math.trunc(a / b);
  }

  private binaryPow(lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die) {
      const exp = this.asNumber(rhs);
      return lhs.pow(exp);
    }
    const a = this.asNumber(lhs);
    const b = this.asNumber(rhs);
    return Math.pow(a, b);
  }

  private binaryCompare(op: string, lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die || rhs instanceof Die) {
      const left =
        lhs instanceof Die ? lhs : Die.fromConstant(this.asNumber(lhs));
      const right =
        rhs instanceof Die ? rhs : Die.fromConstant(this.asNumber(rhs));
      return left.compare(op, right);
    }
    if (lhs instanceof Sequence || rhs instanceof Sequence) {
      if (lhs instanceof Sequence && typeof rhs === 'number') {
        let sum = 0;
        for (const e of lhs.elements) if (this.evalCompare(op, e, rhs)) sum++;
        return sum;
      }
      if (typeof lhs === 'number' && rhs instanceof Sequence) {
        let sum = 0;
        for (const e of rhs.elements) if (this.evalCompare(op, lhs, e)) sum++;
        return sum;
      }
      if (lhs instanceof Sequence && rhs instanceof Sequence) {
        const len = Math.min(lhs.elements.length, rhs.elements.length);
        for (let i = 0; i < len; i++) {
          if (lhs.elements[i] !== rhs.elements[i]) {
            return this.evalCompare(op, lhs.elements[i], rhs.elements[i])
              ? 1
              : 0;
          }
        }
        if (lhs.elements.length !== rhs.elements.length) {
          return this.evalCompare(op, lhs.elements.length, rhs.elements.length)
            ? 1
            : 0;
        }
        return op === '==' ? 1 : 0;
      }
    }
    const a = this.asNumber(lhs);
    const b = this.asNumber(rhs);
    return this.evalCompare(op, a, b) ? 1 : 0;
  }

  private evalCompare(op: string, a: number, b: number): boolean {
    switch (op) {
      case '==':
        return a === b;
      case '!=':
        return a !== b;
      case '<':
        return a < b;
      case '>':
        return a > b;
      case '<=':
        return a <= b;
      case '>=':
        return a >= b;
      default:
        throw new Error(`Unknown comparison ${op}`);
    }
  }

  private binaryLogicalAnd(lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die || rhs instanceof Die) {
      const left =
        lhs instanceof Die
          ? lhs
          : Die.fromConstant(this.asNumber(lhs) !== 0 ? 1 : 0);
      const right =
        rhs instanceof Die
          ? rhs
          : Die.fromConstant(this.asNumber(rhs) !== 0 ? 1 : 0);
      return left.logicalAnd(right);
    }
    const a = this.asNumber(lhs) !== 0;
    const b = this.asNumber(rhs) !== 0;
    return a && b ? 1 : 0;
  }

  private binaryLogicalOr(lhs: Value, rhs: Value): Value {
    if (lhs instanceof Die || rhs instanceof Die) {
      const left =
        lhs instanceof Die
          ? lhs
          : Die.fromConstant(this.asNumber(lhs) !== 0 ? 1 : 0);
      const right =
        rhs instanceof Die
          ? rhs
          : Die.fromConstant(this.asNumber(rhs) !== 0 ? 1 : 0);
      return left.logicalOr(right);
    }
    const a = this.asNumber(lhs) !== 0;
    const b = this.asNumber(rhs) !== 0;
    return a || b ? 1 : 0;
  }

  private unaryNot(operand: Value): Value {
    if (operand instanceof Die) return operand.logicalNot();
    const val = this.asNumber(operand) !== 0;
    return val ? 0 : 1;
  }

  private unaryHash(operand: Value): Value {
    if (operand instanceof Sequence) return operand.length;
    if (operand instanceof Die) return 1;
    if (typeof operand === 'number') return Math.abs(operand).toString().length;
    throw new Error('# operator not defined');
  }

  private unaryMinus(operand: Value): Value {
    if (operand instanceof Die) return operand.mul(-1);
    if (typeof operand === 'number') return -operand;
    throw new Error('Unary minus only for numbers and dice');
  }

  private asNumber(val: Value): number {
    if (typeof val === 'number') return val;
    if (val instanceof Die) throw new Error('Expected number but got die');
    if (val instanceof Sequence) return val.sum();
    throw new Error('Cannot convert to number');
  }

  private asSequence(val: Value): Sequence {
    if (val instanceof Sequence) return val;
    if (typeof val === 'number') return new Sequence([val]);
    throw new Error('Cannot convert to sequence');
  }
}

// ============================================================================
// Public API
// ============================================================================

export function evaluate(script: string) {
  const visitor = new InterpreterVisitor();
  return visitor.evaluate(script);
}
