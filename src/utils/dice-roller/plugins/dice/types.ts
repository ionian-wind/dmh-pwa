// Dice plugin specific types

import type { ASTNode, EvaluationContext, EvaluationResult } from '../../lib/types';

// Dice AST node types
export type DiceAstNode = 
  | DiceNode 
  | LabeledDiceNode
  | CustomDiceNode
  | GroupedRollNode
  | ArithmeticNode 
  | NumberNode 
  | FunctionNode 
  | GroupNode 
  | UnaryNode 
  | MacroNode 
  | TableNode
  | FudgeDiceNode
  | InlineRollNode;

export interface DiceNode {
  type: 'dice';
  count: number;
  sides: number;
  modifiers: ModifierNode[];
  label?: string;
}

export interface LabeledDiceNode extends DiceNode {
  label?: string;
}

export interface CustomDiceNode {
  type: 'custom-dice';
  count: number;
  sides: number[];
  modifiers: ModifierNode[];
  label?: string;
}

export interface GroupedRollNode {
  type: 'grouped-roll';
  expressions: DiceAstNode[];
  modifiers: ModifierNode[];
}

export interface ArithmeticNode {
  type: 'arithmetic';
  op: '+' | '-' | '*' | '/' | '%' | '**';
  left: DiceAstNode;
  right: DiceAstNode;
}

export interface UnaryNode {
  type: 'unary';
  op: '-';
  operand: DiceAstNode;
}

export interface MacroNode {
  type: 'macro';
  name: string;
}

export interface TableNode {
  type: 'table';
  name: string;
  count: number;
}

export interface NumberNode {
  type: 'number';
  value: number;
}

export interface FunctionNode {
  type: 'function';
  name: 'floor' | 'ceil' | 'round' | 'abs' | 'min' | 'max';
  args: DiceAstNode[];
}

export interface GroupNode {
  type: 'group';
  expressions: DiceAstNode[];
}

// Dice modifier types
export interface ModifierNode {
  type: string;
  value?: any;
  target?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
}

// Keep/Drop modifiers
export interface KeepHighestModifier extends ModifierNode {
  type: 'kh';
  value: number;
}

export interface KeepLowestModifier extends ModifierNode {
  type: 'kl';
  value: number;
}

export interface DropHighestModifier extends ModifierNode {
  type: 'dh';
  value: number;
}

export interface DropLowestModifier extends ModifierNode {
  type: 'dl';
  value: number;
}

export interface KeepAboveModifier extends ModifierNode {
  type: 'k>';
  value: number;
}

export interface KeepBelowModifier extends ModifierNode {
  type: 'k<';
  value: number;
}

// Reroll modifiers
export interface RerollModifier extends ModifierNode {
  type: 'r';
  value: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
}

export interface RerollOnceModifier extends ModifierNode {
  type: 'ro';
  value: number;
}

export interface RerollUntilSuccessModifier extends ModifierNode {
  type: 'ra';
  value: number;
}

// Explosion modifiers
export interface ExplodeModifier extends ModifierNode {
  type: 'explode';
  value: '!' | '!p' | '!!' | '!r';
  target?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  limit?: number;
}

// Success/Failure modifiers
export interface SuccessModifier extends ModifierNode {
  type: 'success';
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  target: number;
  mode?: 's' | 'f'; // success or failure
}

export interface CriticalModifier extends ModifierNode {
  type: 'critical';
  mode: 'cs' | 'cf'; // critical success or critical failure
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  target: number;
}

// Sorting modifiers
export interface SortModifier extends ModifierNode {
  type: 'sort';
  value: 'sa' | 'sd'; // sort ascending or descending
}

// Min/Max modifiers
export interface MinModifier extends ModifierNode {
  type: 'mi';
  value: number;
}

export interface MaxModifier extends ModifierNode {
  type: 'ma';
  value: number;
}

// Matching modifier
export interface MatchModifier extends ModifierNode {
  type: 'm';
}

// Dice evaluation result
export interface DiceEvaluationResult {
  rolls?: number[];
  total: number;
  warnings?: string[];
  details?: any;
}

// Dice evaluation context
export interface DiceEvaluationContext extends EvaluationContext {
  maxRolls?: number;
  allowInfinite?: boolean;
}

export interface FudgeDiceNode {
  type: 'fudge-dice';
  count: number;
  variant: 'basic' | '1' | '2' | '3';
  modifiers: ModifierNode[];
  label?: string;
}

export interface InlineRollNode {
  type: 'inline-roll';
  expression: string;
  index?: number;
} 