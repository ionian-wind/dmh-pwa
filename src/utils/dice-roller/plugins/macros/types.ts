// Macro AST node type
export interface MacroAstNode {
  type: 'macro';
  name: string;
}

// Macro extraction result type
export interface MacroExtractionResult {
  name: string;
}
