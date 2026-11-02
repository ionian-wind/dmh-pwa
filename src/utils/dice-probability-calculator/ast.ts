export type ParamType = 'n' | 'd' | 's';

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | '&'
  | '|'
  | '@';

export type UnaryOperator = '+' | '-' | '!' | '#';

export interface NumberNode {
  kind: 'number';
  value: number;
}

export interface VariableNode {
  kind: 'variable';
  name: string;
}

export interface BinaryNode {
  kind: 'binary';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface UnaryNode {
  kind: 'unary';
  operator: UnaryOperator;
  operand: Expression;
}

export interface DiceNode {
  kind: 'dice';
  /** Number of dice. `null` means one die. */
  count: Expression | null;
  /** Die faces, or `percent` for the `d%` shorthand. */
  faces: Expression | 'percent';
}

export interface SequenceElement {
  value: Expression;
  /** Exclusive upper bound of a range (`value..end`). */
  rangeEnd?: Expression;
  /** Repetition count (`value:count`). */
  repeat?: Expression;
}

export interface SequenceNode {
  kind: 'sequence';
  elements: SequenceElement[];
}

export type CallItem =
  | { kind: 'word'; value: string }
  | { kind: 'expression'; value: Expression };

export interface CallNode {
  kind: 'call';
  items: CallItem[];
}

export type Expression =
  | NumberNode
  | VariableNode
  | BinaryNode
  | UnaryNode
  | DiceNode
  | SequenceNode
  | CallNode;

export type SignaturePart =
  | { kind: 'word'; value: string }
  | { kind: 'param'; name: string; type: ParamType | null };

export interface FunctionStatement {
  kind: 'function';
  signature: SignaturePart[];
  body: Statement[];
}

export interface AssignmentStatement {
  kind: 'assignment';
  name: string;
  value: Expression;
}

export interface OutputStatement {
  kind: 'output';
  value: Expression;
  name?: string;
}

export interface SetStatement {
  kind: 'set';
  name: string;
  value: Expression | string;
}

export interface LoopStatement {
  kind: 'loop';
  variable: string;
  range: Expression;
  body: Statement[];
}

export interface IfBranch {
  condition: Expression;
  body: Statement[];
}

export interface IfStatement {
  kind: 'if';
  branches: IfBranch[];
  elseBody?: Statement[];
}

export interface ResultStatement {
  kind: 'result';
  value: Expression;
}

export type Statement =
  | FunctionStatement
  | AssignmentStatement
  | OutputStatement
  | SetStatement
  | LoopStatement
  | IfStatement
  | ResultStatement;

export interface Program {
  statements: Statement[];
}
