import type {
  CallItem,
  Expression,
  FunctionStatement,
  IfStatement,
  Program,
  SequenceElement,
  SignaturePart,
  Statement,
} from './ast';
import { builtins, toDie, toNumber } from './builtins';
import { Die, enumerateRolls } from './die';
import { Seq } from './seq';
import {
  DEFAULT_SETTINGS,
  type CalculationResult,
  type OutputResult,
  type RawOutput,
  type Settings,
  type Value,
} from './types';

interface FunctionDefinition {
  signature: SignaturePart[];
  body: Statement[];
  closure: Environment;
}

class Environment {
  private readonly variables = new Map<string, Value>();
  private readonly functions: FunctionDefinition[] = [];

  constructor(private readonly parent?: Environment) {}

  get(name: string): Value | undefined {
    if (this.variables.has(name)) return this.variables.get(name);
    return this.parent?.get(name);
  }

  declare(name: string, value: Value): void {
    this.variables.set(name, value);
  }

  assign(name: string, value: Value): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }
    if (this.parent?.get(name) !== undefined) {
      this.parent.assign(name, value);
      return;
    }
    this.variables.set(name, value);
  }

  addFunction(definition: FunctionDefinition): void {
    this.functions.push(definition);
  }

  allFunctions(): FunctionDefinition[] {
    return [...(this.parent?.allFunctions() ?? []), ...this.functions];
  }

  copyVisibleVariablesInto(target: Environment): void {
    for (const [name, value] of this.visibleVariables()) {
      target.declare(name, value);
    }
  }

  private visibleVariables(): Map<string, Value> {
    const result = new Map<string, Value>(
      this.parent?.visibleVariables() ?? [],
    );
    for (const [name, value] of this.variables) result.set(name, value);
    return result;
  }
}

type ExecOutcome = { kind: 'normal' } | { kind: 'result'; value: Value };

const NORMAL: ExecOutcome = { kind: 'normal' };

interface WeightedResult {
  value: Value;
  weight: bigint;
}

interface InvocationCandidate {
  signature: SignaturePart[];
  args: Value[];
  score: number;
  invoke: (args: Value[]) => Value;
}

type ResolvedItem =
  { kind: 'word'; value: string } | { kind: 'expression'; value: Value };

export class Evaluator {
  private readonly settings: Settings = { ...DEFAULT_SETTINGS };
  private readonly outputs: RawOutput[] = [];
  private readonly functions: FunctionDefinition[] = [];
  private callDepth = 0;

  calculate(program: Program): CalculationResult {
    const root = new Environment();
    this.execStatements(program.statements, root);

    return {
      outputs: this.outputs.map((output) => this.finalizeOutput(output)),
      settings: { ...this.settings },
    };
  }

  private execStatements(
    statements: Statement[],
    environment: Environment,
  ): ExecOutcome {
    for (const statement of statements) {
      const outcome = this.execStatement(statement, environment);
      if (outcome.kind === 'result') return outcome;
    }
    return NORMAL;
  }

  private execStatement(
    statement: Statement,
    environment: Environment,
  ): ExecOutcome {
    switch (statement.kind) {
      case 'assignment':
        environment.assign(
          statement.name,
          this.evalExpression(statement.value, environment),
        );
        return NORMAL;

      case 'function':
        this.defineFunction(statement, environment);
        return NORMAL;

      case 'output': {
        if (this.callDepth > 0) {
          throw new Error('output cannot be used inside a function');
        }
        const value = this.evalExpression(statement.value, environment);
        this.outputs.push({
          value,
          name: statement.name
            ? this.resolveString(statement.name, environment)
            : undefined,
        });
        return NORMAL;
      }

      case 'set':
        if (this.callDepth > 0) {
          throw new Error('set cannot be used inside a function');
        }
        this.applySetting(
          statement.name,
          typeof statement.value === 'string'
            ? statement.value
            : this.evalExpression(statement.value, environment),
        );
        return NORMAL;

      case 'loop':
        return this.execLoop(statement, environment);

      case 'if':
        return this.execIf(statement, environment);

      case 'result':
        return {
          kind: 'result',
          value: this.evalExpression(statement.value, environment),
        };
    }
  }

  private defineFunction(
    statement: FunctionStatement,
    environment: Environment,
  ): void {
    const definition: FunctionDefinition = {
      signature: statement.signature,
      body: statement.body,
      closure: environment,
    };
    this.functions.push(definition);
    environment.addFunction(definition);
  }

  private execLoop(
    statement: Extract<Statement, { kind: 'loop' }>,
    environment: Environment,
  ): ExecOutcome {
    const range = this.evalExpression(statement.range, environment);
    let values: number[];
    if (range instanceof Seq) {
      values = [...range.elements];
    } else if (range instanceof Die) {
      values = Seq.ordered(
        range.outcomes().map((outcome) => outcome.value),
        this.settings.positionOrder,
      ).toArray();
    } else if (typeof range === 'number') {
      values = [range];
    } else {
      throw new Error('A loop range must be a sequence of numbers');
    }

    for (const value of values) {
      const scope = new Environment(environment);
      scope.declare(statement.variable, value);
      const outcome = this.execStatements(statement.body, scope);
      if (outcome.kind === 'result') return outcome;
    }
    return NORMAL;
  }

  private execIf(
    statement: IfStatement,
    environment: Environment,
  ): ExecOutcome {
    for (const branch of statement.branches) {
      const condition = this.evalExpression(branch.condition, environment);
      if (this.truthy(condition)) {
        return this.execStatements(branch.body, environment);
      }
    }
    if (statement.elseBody) {
      return this.execStatements(statement.elseBody, environment);
    }
    return NORMAL;
  }

  private applySetting(name: string, value: Value): void {
    switch (name) {
      case 'position order': {
        if (value !== 'highest first' && value !== 'lowest first') {
          throw new Error(
            'The "position order" setting must be "highest first" or "lowest first"',
          );
        }
        this.settings.positionOrder = value;
        return;
      }
      case 'explode depth': {
        const depth = toNumber(value);
        if (!Number.isInteger(depth) || depth < 1) {
          throw new Error(
            'The "explode depth" setting must be a positive integer',
          );
        }
        this.settings.explodeDepth = depth;
        return;
      }
      case 'maximum function depth': {
        const depth = toNumber(value);
        if (!Number.isInteger(depth) || depth < 1) {
          throw new Error(
            'The "maximum function depth" setting must be a positive integer',
          );
        }
        this.settings.maxFunctionDepth = depth;
        return;
      }
      default:
        throw new Error(`Unknown setting "${name}"`);
    }
  }

  private evalExpression(
    expression: Expression,
    environment: Environment,
  ): Value {
    switch (expression.kind) {
      case 'number':
        return expression.value;

      case 'variable': {
        const value = environment.get(expression.name);
        if (value === undefined) {
          throw new Error(`Undefined variable "${expression.name}"`);
        }
        return value;
      }

      case 'binary':
        return this.evalBinary(
          expression.operator,
          this.evalExpression(expression.left, environment),
          this.evalExpression(expression.right, environment),
        );

      case 'unary':
        return this.evalUnary(
          expression.operator,
          this.evalExpression(expression.operand, environment),
        );

      case 'dice':
        return this.evalDice(expression, environment);

      case 'sequence':
        return this.evalSequence(expression.elements, environment);

      case 'call':
        return this.evalCall(expression.items, environment);
    }
  }

  private evalDice(
    expression: Extract<Expression, { kind: 'dice' }>,
    environment: Environment,
  ): Die {
    const count =
      expression.count === null
        ? 1
        : toNumber(this.evalExpression(expression.count, environment));
    if (!Number.isInteger(count)) {
      throw new Error('The number of dice must be an integer');
    }

    let base: Die;
    if (expression.faces === 'percent') {
      base = Die.uniform(100);
    } else {
      const faces = this.evalExpression(expression.faces, environment);
      if (faces instanceof Die) {
        base = faces;
      } else if (faces instanceof Seq) {
        base = Die.fromFaces(faces.elements);
      } else if (typeof faces === 'number') {
        if (faces > 0) {
          base = Die.uniform(faces);
        } else if (faces === 0) {
          base = Die.constant(0);
        } else {
          // AnyDice-compatible handling of `d-1` and similar forms.
          const values: number[] = [];
          for (let value = faces; value < 0; value++) values.push(value);
          base = Die.fromFaces(values);
        }
      } else {
        throw new Error('Invalid die definition');
      }
    }

    if (count < 0) {
      return base.roll(-count, this.settings.positionOrder).mul(-1);
    }
    return base.roll(count, this.settings.positionOrder);
  }

  private evalSequence(
    elements: SequenceElement[],
    environment: Environment,
  ): Seq {
    const values: number[] = [];

    const appendValue = (value: Value) => {
      if (typeof value === 'number') {
        values.push(value);
      } else if (value instanceof Seq) {
        values.push(...value.elements);
      } else if (value instanceof Die) {
        values.push(...value.outcomes().map((outcome) => outcome.value));
      } else {
        throw new Error('A sequence can only contain numbers');
      }
    };

    for (const element of elements) {
      const value = this.evalExpression(element.value, environment);

      let rangeValues: number[] | null = null;
      if (element.rangeEnd) {
        const start = toNumber(value);
        const end = toNumber(
          this.evalExpression(element.rangeEnd, environment),
        );
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
          throw new Error('A sequence range must use integers');
        }
        rangeValues = [];
        const step = start <= end ? 1 : -1;
        for (let current = start; ; current += step) {
          rangeValues.push(current);
          if (current === end) break;
        }
      }

      if (element.repeat) {
        const count = toNumber(
          this.evalExpression(element.repeat, environment),
        );
        if (!Number.isInteger(count) || count < 0) {
          throw new Error(
            'A sequence repetition count must be a non-negative integer',
          );
        }
        for (let i = 0; i < count; i++) {
          if (rangeValues) values.push(...rangeValues);
          else appendValue(value);
        }
        continue;
      }

      if (rangeValues) {
        values.push(...rangeValues);
      } else {
        appendValue(value);
      }
    }

    // Sequence literals preserve their written order. `sort` is the explicit
    // operation that applies the position order setting.
    return new Seq(values);
  }

  private evalCall(items: CallItem[], environment: Environment): Value {
    const resolved: ResolvedItem[] = items.map((item) =>
      item.kind === 'word'
        ? item
        : {
            kind: 'expression',
            value: this.evalExpression(item.value, environment),
          },
    );

    const candidates: InvocationCandidate[] = [];
    for (const definition of this.functions) {
      const args = matchSignature(definition.signature, resolved);
      if (!args) continue;
      candidates.push({
        signature: definition.signature,
        args,
        score: signatureScore(definition.signature, args),
        invoke: (values) =>
          this.invokeUserFunction(definition, values, environment),
      });
    }
    for (const builtin of builtins) {
      const match = builtin.variadicTail
        ? matchVariadicSignature(
            builtin.signature,
            builtin.variadicTail,
            resolved,
          )
        : fixedMatch(builtin.signature, resolved);
      if (!match) continue;
      candidates.push({
        signature: match.signature,
        args: match.args,
        score: signatureScore(match.signature, match.args),
        invoke: (values) => builtin.fn(values, { settings: this.settings }),
      });
    }

    if (candidates.length === 0) {
      throw new Error(`Unknown function [${callName(resolved)}]`);
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return this.invokeWithSignature(best.signature, best.args, best.invoke);
  }

  private invokeUserFunction(
    definition: FunctionDefinition,
    args: Value[],
    caller: Environment,
  ): Value {
    if (this.callDepth >= this.settings.maxFunctionDepth) {
      return Die.empty();
    }

    this.callDepth++;
    try {
      const scope = new Environment(definition.closure);
      // AnyDice functions can see the variables of their caller. This is what
      // makes idioms such as `[qin ... vs ...]` delegating to a helper that
      // reads MODIFIER/TARGET work.
      definition.closure.copyVisibleVariablesInto(scope);
      caller.copyVisibleVariablesInto(scope);
      const parameterNames = definition.signature.filter(
        (part): part is Extract<SignaturePart, { kind: 'param' }> =>
          part.kind === 'param',
      );
      parameterNames.forEach((parameter, index) => {
        scope.declare(parameter.name, args[index] ?? 0);
      });

      const outcome = this.execStatements(definition.body, scope);
      return outcome.kind === 'result' ? outcome.value : Die.empty();
    } finally {
      this.callDepth--;
    }
  }

  private invokeWithSignature(
    signature: SignaturePart[],
    args: Value[],
    invoke: (values: Value[]) => Value,
  ): Value {
    const parameters = signature.filter(
      (part): part is Extract<SignaturePart, { kind: 'param' }> =>
        part.kind === 'param',
    );

    const baseArgs: Value[] = [...args];
    const hard: Array<{ index: number; values: WeightedResult[] }> = [];

    parameters.forEach((parameter, index) => {
      const value = baseArgs[index];
      const expected = parameter.type;
      if (expected === null) return;

      if (expected === 'n') {
        if (value instanceof Die) {
          hard.push({
            index,
            values: value.outcomes().map((outcome) => ({
              value: outcome.value,
              weight: outcome.weight,
            })),
          });
        } else if (value instanceof Seq) {
          baseArgs[index] = value.sum();
        } else if (typeof value !== 'number') {
          throw new Error(`Parameter "${parameter.name}" expects a number`);
        }
        return;
      }

      if (expected === 's') {
        if (value instanceof Die) {
          const pool = value.pool ?? { count: 1, die: value };
          hard.push({
            index,
            values: enumerateRolls(
              pool.die,
              pool.count,
              this.settings.positionOrder,
            ).map((roll) => ({
              value: Seq.ordered(roll.values, this.settings.positionOrder),
              weight: roll.weight,
            })),
          });
        } else if (typeof value === 'number') {
          baseArgs[index] = new Seq([value]);
        } else if (!(value instanceof Seq)) {
          throw new Error(`Parameter "${parameter.name}" expects a sequence`);
        }
        return;
      }

      // expected === 'd'
      if (!(value instanceof Die)) {
        baseArgs[index] = toDie(value);
      }
    });

    if (hard.length === 0) {
      return invoke(baseArgs);
    }

    const results: WeightedResult[] = [];
    const visit = (hardIndex: number, current: Value[], weight: bigint) => {
      if (hardIndex === hard.length) {
        results.push({ value: invoke([...current]), weight });
        return;
      }
      const entry = hard[hardIndex];
      for (const candidate of entry.values) {
        const next = [...current];
        next[entry.index] = candidate.value;
        visit(hardIndex + 1, next, weight * candidate.weight);
      }
    };

    visit(0, baseArgs, 1n);

    // A function may return a die (for example HITDAMAGE). Each returned die
    // has its own total weight, so bring all results onto a common denominator
    // before merging them.
    let scale = 1n;
    for (const result of results) {
      if (result.value instanceof Die) {
        const total = result.value.totalWeight;
        if (total > 0n) scale = lcm(scale, total);
      }
    }

    const weights = new Map<number, bigint>();
    for (const result of results) {
      if (result.value instanceof Die) {
        const total = result.value.totalWeight;
        if (total === 0n) continue;
        const factor = result.weight * (scale / total);
        for (const outcome of result.value.outcomes()) {
          weights.set(
            outcome.value,
            (weights.get(outcome.value) ?? 0n) + outcome.weight * factor,
          );
        }
      } else {
        const value = toNumber(result.value);
        weights.set(value, (weights.get(value) ?? 0n) + result.weight * scale);
      }
    }
    return new Die(weights);
  }

  private evalBinary(
    operator: Extract<Expression, { kind: 'binary' }>['operator'],
    left: Value,
    right: Value,
  ): Value {
    switch (operator) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '^':
        return this.arithmetic(operator, left, right);
      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return this.compare(operator, left, right);
      case '&':
        return this.logical('and', left, right);
      case '|':
        return this.logical('or', left, right);
      case '@':
        return this.access(left, right);
    }
  }

  private arithmetic(
    operator: '+' | '-' | '*' | '/' | '^',
    left: Value,
    right: Value,
  ): Value {
    const leftDie = left instanceof Die;
    const rightDie = right instanceof Die;
    if (!leftDie && !rightDie) {
      const a = toNumber(left);
      const b = toNumber(right);
      switch (operator) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          return Math.trunc(a / b);
        case '^':
          if (!Number.isInteger(b) || b < 0) {
            throw new Error('Exponent must be a non-negative integer');
          }
          return Math.trunc(a ** b);
      }
    }

    if (leftDie && rightDie) {
      return this.applyDieBinary(operator, left as Die, right as Die);
    }
    if (leftDie) {
      const die = left as Die;
      const number = toNumber(right);
      switch (operator) {
        case '+':
          return die.add(number);
        case '-':
          return die.sub(number);
        case '*':
          return die.mul(number);
        case '/':
          return die.div(number);
        case '^':
          return die.pow(number);
      }
    }

    const die = right as Die;
    const number = toNumber(left);
    return die.map((value) => {
      switch (operator) {
        case '+':
          return number + value;
        case '-':
          return number - value;
        case '*':
          return number * value;
        case '/':
          if (value === 0) throw new Error('Division by zero');
          return Math.trunc(number / value);
        case '^':
          if (!Number.isInteger(value) || value < 0) {
            throw new Error('Exponent must be a non-negative integer');
          }
          return Math.trunc(number ** value);
      }
    });
  }

  private applyDieBinary(
    operator: '+' | '-' | '*' | '/' | '^',
    left: Die,
    right: Die,
  ): Die {
    switch (operator) {
      case '+':
        return left.add(right);
      case '-':
        return left.sub(right);
      case '*':
        return left.mul(right);
      case '/':
        return left.div(right);
      case '^':
        return left.pow(right);
    }
  }

  private compare(
    operator: '=' | '!=' | '<' | '>' | '<=' | '>=',
    left: Value,
    right: Value,
  ): Value {
    if (left instanceof Seq && right instanceof Seq) {
      return compareSequences(left, right, operator);
    }
    if (left instanceof Seq && !(right instanceof Die)) {
      return compareSequenceToNumber(left, right, operator);
    }
    if (right instanceof Seq && !(left instanceof Die)) {
      return compareSequenceToNumber(right, left, flip(operator));
    }

    if (left instanceof Die && right instanceof Die) {
      return left.compare(right, operator);
    }
    if (left instanceof Die) {
      return left.compare(toNumber(right), operator);
    }
    if (right instanceof Die) {
      return right.map((value) =>
        compareNumbers(toNumber(left), value, operator),
      );
    }
    return compareNumbers(toNumber(left), toNumber(right), operator);
  }

  private logical(operator: 'and' | 'or', left: Value, right: Value): Value {
    const leftDie = left instanceof Die;
    const rightDie = right instanceof Die;
    if (!leftDie && !rightDie) {
      const a = this.truthy(left);
      const b = this.truthy(right);
      return (operator === 'and' ? a && b : a || b) ? 1 : 0;
    }

    const leftValue = leftDie
      ? (left as Die).map((value) => (value !== 0 ? 1 : 0))
      : Die.constant(this.truthy(left) ? 1 : 0);
    const rightValue = rightDie
      ? (right as Die).map((value) => (value !== 0 ? 1 : 0))
      : Die.constant(this.truthy(right) ? 1 : 0);

    return operator === 'and'
      ? leftValue.logicalAnd(rightValue)
      : leftValue.logicalOr(rightValue);
  }

  private evalUnary(
    operator: Extract<Expression, { kind: 'unary' }>['operator'],
    operand: Value,
  ): Value {
    switch (operator) {
      case '!':
        if (operand instanceof Die) return operand.logicalNot();
        return this.truthy(operand) ? 0 : 1;
      case '#':
        if (operand instanceof Die) return operand.collectionSize;
        if (operand instanceof Seq) return operand.length;
        if (typeof operand === 'number') {
          return Math.abs(operand).toString().length;
        }
        throw new Error('The # operator requires a number, sequence or die');
      case '+':
        if (operand instanceof Die) return operand;
        return toNumber(operand);
      case '-':
        if (operand instanceof Die) return operand.mul(-1);
        return -toNumber(operand);
    }
  }

  private access(left: Value, right: Value): Value {
    if (left instanceof Die) {
      throw new Error('A die cannot be used as a position selector');
    }

    if (right instanceof Die) {
      const indices =
        left instanceof Seq ? [...left.elements] : [toNumber(left)];
      return right.select(indices, this.settings.positionOrder);
    }

    if (right instanceof Seq) {
      if (left instanceof Seq) {
        return left.elements.reduce((sum, index) => sum + right.get(index), 0);
      }
      return right.get(toNumber(left));
    }

    if (left instanceof Seq) {
      const digits = Math.abs(toNumber(right)).toString().split('').map(Number);
      return left.elements.reduce(
        (sum, index) => sum + this.digitAt(index, digits),
        0,
      );
    }

    const digits = Math.abs(toNumber(right)).toString().split('').map(Number);
    return this.digitAt(toNumber(left), digits);
  }

  private digitAt(position: number, digits: readonly number[]): number {
    if (!Number.isInteger(position)) return 0;
    const index =
      this.settings.positionOrder === 'highest first'
        ? position - 1
        : digits.length - position;
    return digits[index] ?? 0;
  }

  private truthy(value: Value): boolean {
    if (value instanceof Die) {
      throw new Error('A die cannot be used as a boolean condition');
    }
    return toNumber(value) !== 0;
  }

  private resolveString(template: string, environment: Environment): string {
    return template.replace(/\[([A-Z_][A-Z0-9_]*)\]/g, (_, name: string) => {
      const value = environment.get(name);
      return value === undefined ? '' : formatValue(value);
    });
  }

  private finalizeOutput(output: RawOutput): OutputResult {
    const die = valueToDie(output.value);
    const total = die.totalWeight;
    const outcomes = die.outcomes().map((outcome) => ({
      value: outcome.value,
      weight: outcome.weight,
      probability: total === 0n ? 0 : Number(outcome.weight) / Number(total),
    }));
    const stats = die.stats();
    return {
      name: output.name,
      outcomes,
      mean: stats.mean,
      stddev: stats.stddev,
      totalWeight: total,
    };
  }
}

function valueToDie(value: Value): Die {
  if (value instanceof Die) return value;
  if (value instanceof Seq) return Die.fromFaces(value.elements);
  if (typeof value === 'number') return Die.constant(value);
  throw new Error('A string cannot be output');
}

function fixedMatch(
  signature: SignaturePart[],
  items: ResolvedItem[],
): { signature: SignaturePart[]; args: Value[] } | null {
  const args = matchSignature(signature, items);
  return args ? { signature, args } : null;
}

function matchVariadicSignature(
  base: SignaturePart[],
  tail: SignaturePart[],
  items: ResolvedItem[],
): { signature: SignaturePart[]; args: Value[] } | null {
  if (items.length < base.length) return null;
  const args: Value[] = [];
  const signature: SignaturePart[] = [];
  let index = 0;

  for (const part of base) {
    const item = items[index++];
    if (part.kind === 'word') {
      if (item.kind !== 'word' || item.value.toLowerCase() !== part.value) {
        return null;
      }
    } else {
      if (item.kind !== 'expression') return null;
      args.push(item.value);
    }
    signature.push(part);
  }

  while (index < items.length) {
    for (const part of tail) {
      const item = items[index++];
      if (!item) return null;
      if (part.kind === 'word') {
        if (item.kind !== 'word' || item.value.toLowerCase() !== part.value) {
          return null;
        }
      } else {
        if (item.kind !== 'expression') return null;
        args.push(item.value);
      }
      signature.push(part);
    }
  }

  return { signature, args };
}

function matchSignature(
  signature: SignaturePart[],
  items: ResolvedItem[],
): Value[] | null {
  if (signature.length !== items.length) return null;
  const args: Value[] = [];
  for (let i = 0; i < signature.length; i++) {
    const part = signature[i];
    const item = items[i];
    if (part.kind === 'word') {
      if (
        item.kind !== 'word' ||
        item.value.toLowerCase() !== part.value.toLowerCase()
      ) {
        return null;
      }
      continue;
    }
    if (item.kind !== 'expression') return null;
    args.push(item.value);
  }
  return args;
}

function signatureScore(signature: SignaturePart[], args: Value[]): number {
  let score = 0;
  let argIndex = 0;
  for (const part of signature) {
    if (part.kind !== 'param') continue;
    const value = args[argIndex++];
    if (part.type === null) {
      score += 3;
      continue;
    }
    if (part.type === 'n') {
      score += typeof value === 'number' ? 3 : value instanceof Seq ? 1 : 0;
    } else if (part.type === 's') {
      score += value instanceof Seq ? 3 : typeof value === 'number' ? 1 : 0;
    } else {
      score += value instanceof Die ? 3 : value instanceof Seq ? 1 : 1;
    }
  }
  return score;
}

function callName(items: ResolvedItem[]): string {
  return items
    .map((item) => (item.kind === 'word' ? item.value : `<expression>`))
    .join(' ');
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return (a / gcd(a, b)) * b;
}

function compareNumbers(
  left: number,
  right: number,
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=',
): number {
  switch (operator) {
    case '=':
      return left === right ? 1 : 0;
    case '!=':
      return left !== right ? 1 : 0;
    case '<':
      return left < right ? 1 : 0;
    case '>':
      return left > right ? 1 : 0;
    case '<=':
      return left <= right ? 1 : 0;
    case '>=':
      return left >= right ? 1 : 0;
  }
}

function compareSequenceToNumber(
  sequence: Seq,
  other: Value,
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=',
): number {
  const number = toNumber(other);
  return sequence.elements.reduce(
    (count, value) => count + (compareNumbers(value, number, operator) ? 1 : 0),
    0,
  );
}

function compareSequences(
  left: Seq,
  right: Seq,
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=',
): number {
  if (operator === '=' || operator === '!=') {
    const equal =
      left.length === right.length &&
      left.elements.every((value, index) => value === right.elements[index]);
    return (operator === '=' ? equal : !equal) ? 1 : 0;
  }

  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    if (left.elements[i] !== right.elements[i]) {
      return compareNumbers(left.elements[i], right.elements[i], operator);
    }
  }
  return compareNumbers(left.length, right.length, operator);
}

function flip(
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=',
): '=' | '!=' | '<' | '>' | '<=' | '>=' {
  switch (operator) {
    case '<':
      return '>';
    case '>':
      return '<';
    case '<=':
      return '>=';
    case '>=':
      return '<=';
    default:
      return operator;
  }
}

function formatValue(value: Value): string {
  if (typeof value === 'number') return String(value);
  if (value instanceof Seq) return value.toString();
  if (value instanceof Die) {
    return `{${value
      .outcomes()
      .map((outcome) => outcome.value)
      .join(', ')}}`;
  }
  return value;
}
