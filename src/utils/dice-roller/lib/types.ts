// Shared types for the dice roller system

// Base AST node interface
export interface ASTNode {
  type: string;
  [key: string]: any;
}

// Evaluation context for all plugins
export interface EvaluationContext {
  macros?: Record<string, ASTNode>;
  tables?: Record<string, any[]>;
  rolls?: Record<string, any>;
  userInput?: Record<string, any>;
  warnings?: string[];
}

// Plugin interface for all dice roller plugins
export interface DiceRollerPlugin {
  name: string;
  register?: (core: any) => void;
  parse?: (input: string) => ASTNode;
  extractQueries?: (ast: ASTNode) => any[];
  extractMacros?: (ast: ASTNode) => any[];
  extractTables?: (ast: ASTNode) => any[];
  extractRolls?: (ast: ASTNode) => any[];
  extractFormatting?: (ast: ASTNode) => any[];
  evaluate?: (node: ASTNode, context: EvaluationContext) => any;
  evaluateMacro?: (node: ASTNode, context: EvaluationContext) => any;
  evaluateRollQuery?: (node: ASTNode, context: EvaluationContext) => any;
  evaluateTable?: (node: ASTNode, context: EvaluationContext) => any;
  evaluateRollReference?: (node: ASTNode, context: EvaluationContext) => any;
  evaluateFormatting?: (node: ASTNode, context: EvaluationContext) => any;
}

// Evaluation result interface
export interface EvaluationResult {
  total: number;
  rolls?: number[];
  warnings?: string[];
  details?: any;
}

// Error types
export class DiceRollerError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'DiceRollerError';
  }
}

export class SyntaxError extends DiceRollerError {
  constructor(message: string) {
    super(message, 'SYNTAX_ERROR');
    this.name = 'SyntaxError';
  }
}

export class ValidationError extends DiceRollerError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class MissingDataError extends DiceRollerError {
  constructor(message: string) {
    super(message, 'MISSING_DATA_ERROR');
    this.name = 'MissingDataError';
  }
}
