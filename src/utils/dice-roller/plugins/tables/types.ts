// Table AST node type
export interface TableAstNode {
  type: 'table';
  name: string;
  count: number;
}

// Table extraction result type
export interface TableExtractionResult {
  name: string;
  count: number;
}
