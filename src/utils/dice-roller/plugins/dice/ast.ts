import { CstNode, IToken } from 'chevrotain';

// AST node types
export type DiceAstNode = DiceNode | ArithmeticNode | NumberNode | FunctionNode | UnaryNode | MacroNode | TableNode | GroupedRollNode;

export interface DiceNode {
  type: 'dice';
  count: number;
  sides: number;
  modifiers: ModifierNode[];
  label?: string;
}

export interface ModifierNode {
  type: string;
  value?: any;
  target?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  limit?: number;
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
  name: string;
  args: DiceAstNode[];
}

export interface GroupedRollNode {
  type: 'grouped-roll';
  expressions: DiceAstNode[];
  modifiers: ModifierNode[];
}

// Helper to extract a token value from CST children
function getTokenValue(children: any, tokenName: string, idx = 0): string | undefined {
  const arr = children[tokenName];
  if (arr && arr[idx] && isIToken(arr[idx])) return arr[idx].image;
  return undefined;
}

function isIToken(obj: any): obj is IToken {
  return obj && typeof obj.startOffset === 'number' && typeof obj.image === 'string';
}

// CST to AST visitor
export function cstToAst(cst: CstNode, lexerTokens?: any[]): DiceAstNode {
  if (!cst) return { type: 'number', value: 0 };
  switch (cst.name) {
    case 'expression':
      return cstToAst(cst.children.additive[0] as CstNode, lexerTokens);
    case 'additive': {
      let left = cstToAst(cst.children.exponential[0] as CstNode, lexerTokens);
      const plusOps = cst.children.Plus || [];
      const minusOps = cst.children.Minus || [];
      const ops = [...plusOps, ...minusOps];
      if (ops.length > 0) {
        for (let i = 0; i < ops.length; ++i) {
          const opToken = ops[i];
          const op = isIToken(opToken) ? (opToken.image as '+' | '-') : '+';
          const right = cstToAst(cst.children.exponential[i + 1] as CstNode, lexerTokens);
          left = { type: 'arithmetic', op, left, right };
        }
      }
      return left;
    }
    case 'exponential': {
      let left = cstToAst(cst.children.multiplicative[0] as CstNode, lexerTokens);
      const expOps = cst.children.Exponent || [];
      if (expOps.length > 0) {
        for (let i = 0; i < expOps.length; ++i) {
          const right = cstToAst(cst.children.exponential[i] as CstNode, lexerTokens);
          left = { type: 'arithmetic', op: '**', left, right } as DiceAstNode;
        }
      }
      return left;
    }
    case 'multiplicative': {
      let left = cstToAst(cst.children.primary[0] as CstNode, lexerTokens);
      const multOps = cst.children.Multiply || [];
      const divOps = cst.children.Divide || [];
      const modOps = cst.children.Modulo || [];
      const ops = [...multOps, ...divOps, ...modOps];
      if (ops.length > 0) {
        for (let i = 0; i < ops.length; ++i) {
          const opToken = ops[i];
          const op = isIToken(opToken) ? (opToken.image as '*' | '/' | '%') : '*';
          const right = cstToAst(cst.children.primary[i + 1] as CstNode, lexerTokens);
          left = { type: 'arithmetic', op, left, right };
        }
      }
      return left;
    }
    case 'dice': {
      // [Integer]? D Integer [LabelText]? [modifiers...]
      let count = 1;
      let sides = 0;
      let label: string | undefined = undefined;
      
      // Debug: print keys in cst.children
      console.log('[AST DEBUG] dice cst.children keys:', Object.keys(cst.children));
      
      // Extract count and sides based on CST structure
      const allIntegers = (cst.children.Integer || []).filter((tok: any) => isIToken(tok));
      const dTokens = (cst.children.D || []).filter((tok: any) => isIToken(tok));
      
      if (allIntegers.length >= 2 && dTokens.length > 0) {
        // Both count and sides provided (e.g., "4d6")
        const firstInt = allIntegers[0];
        const secondInt = allIntegers[1];
        if (isIToken(firstInt) && isIToken(secondInt)) {
          count = parseInt(firstInt.image, 10);
          sides = parseInt(secondInt.image, 10);
        }
      } else if (allIntegers.length === 1 && dTokens.length > 0) {
        // Only sides provided (e.g., "d6")
        const firstInt = allIntegers[0];
        if (isIToken(firstInt)) {
          sides = parseInt(firstInt.image, 10);
        }
      }
      
      // Extract label if present
      if (cst.children.LabelText && cst.children.LabelText.length > 0) {
        const labelTokens = cst.children.LabelText.filter((tok: any) => isIToken(tok));
        if (labelTokens.length > 0) {
          // Handle case where label might be split across tokens
          const labelParts = labelTokens.map((tok: any) => tok.image);
          label = labelParts.join('');
        }
      }
      
      // If we have lexer tokens and no label was found, try to reconstruct from lexer tokens
      if (!label && lexerTokens) {
        console.log('[AST DEBUG] Attempting to reconstruct label from lexer tokens');
        console.log('[AST DEBUG] Lexer tokens:', lexerTokens.map((t: any) => ({ image: t.image, type: t.tokenType.name })));
        
        // Find the dice expression in the lexer tokens and extract the label
        const diceStart = lexerTokens.findIndex((tok: any) => 
          tok.tokenType.name === 'Integer' && 
          lexerTokens[lexerTokens.indexOf(tok) + 1]?.tokenType.name === 'D'
        );
        
        console.log('[AST DEBUG] Dice start index:', diceStart);
        
        if (diceStart >= 0) {
          // Look for label tokens after the dice expression
          const labelStart = lexerTokens.findIndex((tok: any, idx: number) => 
            idx > diceStart && tok.tokenType.name === 'LBracket'
          );
          
          console.log('[AST DEBUG] Label start index:', labelStart);
          
          if (labelStart >= 0) {
            const labelEnd = lexerTokens.findIndex((tok: any, idx: number) => 
              idx > labelStart && tok.tokenType.name === 'RBracket'
            );
            
            console.log('[AST DEBUG] Label end index:', labelEnd);
            
            if (labelEnd >= 0) {
              // Extract all tokens between LBracket and RBracket
              const labelTokens = lexerTokens.slice(labelStart + 1, labelEnd);
              console.log('[AST DEBUG] Label tokens:', labelTokens.map((t: any) => ({ image: t.image, type: t.tokenType.name })));
              const labelParts = labelTokens.map((tok: any) => tok.image);
              label = labelParts.join('');
              console.log('[AST DEBUG] Reconstructed label:', label);
            }
          }
        }
      }
      
      // Debug: print keys in cst.children
      if (typeof window === 'undefined') {
        // Only log in Node.js
        console.log('[AST DEBUG] dice cst.children keys:', Object.keys(cst.children));
        console.log('[AST DEBUG] count:', count, 'sides:', sides);
      }
      
      // Modifiers
      const modifiers: ModifierNode[] = [];
      const modifierTokens: IToken[] = [];
      
      // Collect and sort all modifier tokens by their position in the input string
      const modifierKeys = [
        'Kh','Kl','Dh','Dl','Kgt','Klt',
        'R','Ro','Rlt','Rgt','Req','Rne', 
        'Explode',
        'Mi','Ma',
        'M','Gt','Lt','Eq',
        'S','F','Cs','Cf',
        'Sa','Sd','O','E',
        'Integer', // To catch numbers for custom limits
      ];

      for (const key of modifierKeys) {
        if (cst.children[key]) {
          for (const tok of cst.children[key]) {
            if (tok && isIToken(tok)) {
              modifierTokens.push(tok);
            }
          }
        }
      }
      modifierTokens.sort((a, b) => a.startOffset - b.startOffset);

      // Process modifiers in order
      for (let i = 0; i < modifierTokens.length; i++) {
        const token = modifierTokens[i];
        const raw = token.image;
        
        // Skip plain numbers that are part of another modifier
        if (/^\d+$/.test(raw) && i > 0 ) {
            const prevToken = modifierTokens[i-1];
            if (prevToken.image === '!r' || ['<', '>', '=', '<=', '>=', '!='].includes(prevToken.image)) {
                 continue;
            }
        }

        if (raw === '!r') {
          const mod: ModifierNode = { type: 'explode', value: 'recursive' };
          const nextToken = modifierTokens[i + 1];
          
          if (nextToken) {
            // Case: !r<3 (operator and number are separate tokens)
            const nextNextToken = modifierTokens[i + 2];
            if (['<', '>', '=', '<=', '>=', '!='].includes(nextToken.image) && nextNextToken && /^\d+$/.test(nextNextToken.image)) {
              mod.operator = nextToken.image as any;
              mod.limit = parseInt(nextNextToken.image, 10);
              i += 2; // Consume two extra tokens
            } 
            // Case: !r5 (number is the next token)
            else if (/^\d+$/.test(nextToken.image)) {
              mod.operator = '>=';
              mod.limit = parseInt(nextToken.image, 10);
              i += 1; // Consume one extra token
            }
          }
          modifiers.push(mod);
        } else if (raw.startsWith('!')) {
            const mod: ModifierNode = { type: 'explode' };
            if (raw === '!!') mod.value = 'compound';
            else if (raw === '!p') mod.value = 'penetrating';
            else if (raw.match(/^!>(\d+)$/)) {
                mod.value = 'greater';
                mod.operator = '>';
                mod.target = parseInt(raw.slice(2), 10);
            }
            else if (raw.match(/^!<(\d+)$/)) {
                mod.value = 'less';
                mod.operator = '<';
                mod.target = parseInt(raw.slice(2), 10);
            }
             else if (raw.match(/^!=(\d+)$/)) {
                mod.value = 'not_equal';
                mod.operator = '!=';
                mod.target = parseInt(raw.slice(2), 10);
            }
            else if (raw.match(/^!\d+$/)) {
                mod.value = 'custom';
                mod.operator = '>=';
                mod.target = parseInt(raw.slice(1), 10);
            } else {
                mod.value = 'basic';
            }
            modifiers.push(mod);
        } else if (raw.startsWith('r')) {
            let op: '>' | '<' | '>=' | '<=' | '=' | '!=' = '=';
            let value: string;
            if (raw.startsWith('r<=')) { op = '<='; value = raw.slice(3); }
            else if (raw.startsWith('r>=')) { op = '>='; value = raw.slice(3); }
            else if (raw.startsWith('r!=')) { op = '!='; value = raw.slice(3); }
            else if (raw.startsWith('r<')) { op = '<'; value = raw.slice(2); }
            else if (raw.startsWith('r>')) { op = '>'; value = raw.slice(2); }
            else if (raw.startsWith('r=')) { op = '='; value = raw.slice(2); }
            else if (raw.startsWith('ro')) { value = raw.slice(2); }
            else { value = raw.slice(1); }
            modifiers.push({ type: 'r', value, operator: op });
        }
        else if (raw.startsWith('kh')) { modifiers.push({ type: 'kh', value: raw.slice(2) }); }
        else if (raw.startsWith('kl')) { modifiers.push({ type: 'kl', value: raw.slice(2) }); }
        else if (raw.startsWith('dh')) { modifiers.push({ type: 'dh', value: raw.slice(2) }); }
        else if (raw.startsWith('dl')) { modifiers.push({ type: 'dl', value: raw.slice(2) }); }
        else if (raw.startsWith('k>')) { modifiers.push({ type: 'k>', value: raw.slice(2) }); }
        else if (raw.startsWith('k<')) { modifiers.push({ type: 'k<', value: raw.slice(2) }); }
        else if (raw.startsWith('mi')) { modifiers.push({ type: 'mi', value: raw.slice(2) }); }
        else if (raw.startsWith('ma')) { modifiers.push({ type: 'ma', value: raw.slice(2) }); }
        else if (raw.startsWith('>')) { modifiers.push({ type: 'gt', value: raw.slice(1) }); }
        else if (raw.startsWith('<')) { modifiers.push({ type: 'lt', value: raw.slice(1) }); }
        else if (raw.startsWith('=')) { modifiers.push({ type: 'eq', value: raw.slice(1) }); }
        else if (raw.startsWith('cs')) { modifiers.push({ type: 'cs', value: raw.slice(2) }); }
        else if (raw.startsWith('cf')) { modifiers.push({ type: 'cf', value: raw.slice(2) }); }
        else if (raw === 'sa') { modifiers.push({ type: 'sa' }); }
        else if (raw === 'sd') { modifiers.push({ type: 'sd' }); }
        else if (raw === 's') { modifiers.push({ type: 's' }); }
        else if (raw === 'f') { modifiers.push({ type: 'f' }); }
        else if (raw === 'm') { modifiers.push({ type: 'm' }); }
        else if (raw === 'e') { modifiers.push({ type: 'e' }); }
        else if (raw === 'o') { modifiers.push({ type: 'o' }); }
      }
      
      if (typeof window === 'undefined') {
        console.log('[AST DEBUG] final modifiers:', modifiers);
      }
      
      return { type: 'dice', count, sides, modifiers, label };
    }
    case 'tableRoll': {
      // Extract count and table name from table roll
      let count = 1;
      let tableName = '';
      // Get count (optional)
      if (cst.children.Integer && cst.children.Integer[0] && isIToken(cst.children.Integer[0])) {
        const intToken = cst.children.Integer[0];
        if (isIToken(intToken)) {
          count = parseInt(intToken.image, 10);
        }
      }
      // Get table name
      if (cst.children.TableName && cst.children.TableName[0] && isIToken(cst.children.TableName[0])) {
        const tableNameToken = cst.children.TableName[0];
        if (isIToken(tableNameToken)) {
          tableName = tableNameToken.image.slice(1, -1);
        }
      }
      return { type: 'table', name: tableName, count };
    }
    case 'primary': {
      // Handle inlineRoll as a primary expression
      if (cst.children.inlineRoll && cst.children.inlineRoll[0]) {
        const inlineRollCst = cst.children.inlineRoll[0];
        if (typeof inlineRollCst === 'object' && 'children' in inlineRollCst && inlineRollCst.children && inlineRollCst.children.InlineRoll && inlineRollCst.children.InlineRoll[0]) {
          const token = inlineRollCst.children.InlineRoll[0];
          if (isIToken(token)) {
            const raw = token.image;
            const expr = raw.slice(2, -2).trim();
            return { type: 'inline-roll', expression: expr } as any;
          }
        }
      }
      // Handle other primary tokens
      if (cst.children.Integer && cst.children.Integer.length > 0) {
        const token = cst.children.Integer[0] as IToken;
        return { type: 'number', value: parseInt(token.image, 10) } as DiceAstNode;
      }
      
      if (cst.children.Decimal && cst.children.Decimal.length > 0) {
        const token = cst.children.Decimal[0] as IToken;
        return { type: 'number', value: parseFloat(token.image) } as DiceAstNode;
      }
      
      if (cst.children.Macro && cst.children.Macro.length > 0) {
        const token = cst.children.Macro[0] as IToken;
        return { type: 'macro', name: token.image.slice(1) } as DiceAstNode;
      }
      
      if (cst.children.Minus && cst.children.Minus.length > 0) {
        const operand = cstToAst(cst.children.primary[0] as CstNode, lexerTokens);
        return { type: 'unary', op: '-', operand } as DiceAstNode;
      }
      
      if (cst.children.LParen && cst.children.LParen.length > 0) {
        return cstToAst(cst.children.expression[0] as CstNode, lexerTokens);
      }
      
      // Handle other subrules
      if (cst.children.functionCall && cst.children.functionCall.length > 0) {
        return cstToAst(cst.children.functionCall[0] as CstNode, lexerTokens);
      }
      
      if (cst.children.groupedRoll && cst.children.groupedRoll.length > 0) {
        return cstToAst(cst.children.groupedRoll[0] as CstNode, lexerTokens);
      }
      
      if (cst.children.customDice && cst.children.customDice.length > 0) {
        return cstToAst(cst.children.customDice[0] as CstNode, lexerTokens);
      }
      
      if (cst.children.dice && cst.children.dice.length > 0) {
        return cstToAst(cst.children.dice[0] as CstNode, lexerTokens);
      }
      
      if (cst.children.fudgeDice && cst.children.fudgeDice.length > 0) {
        return cstToAst(cst.children.fudgeDice[0] as CstNode, lexerTokens);
      }
      
      if (cst.children.tableRoll && cst.children.tableRoll.length > 0) {
        return cstToAst(cst.children.tableRoll[0] as CstNode, lexerTokens);
      }
      
      throw new Error('Unknown primary expression');
    }
    case 'functionCall': {
      // Function name is the first child token
      const funcNameToken = Object.values(cst.children)
        .flat()
        .find((tok: any) => isIToken(tok) && ['floor','ceil','round','abs','min','max'].includes(isIToken(tok) ? tok.image : ''));
      const name = funcNameToken && isIToken(funcNameToken) ? funcNameToken.image : 'unknown';
      const args = (cst.children.expression || []).map((expr: any) => cstToAst(expr, lexerTokens));
      return { type: 'function', name, args };
    }
    case 'customDice': {
      // [Integer]? D [Integer, Integer, ...] [modifiers...]
      let count = 1;
      const sides: number[] = [];
      
      // Extract count and sides
      const sideTokens = (cst.children.Integer || []).filter((tok: any) => isIToken(tok));
      if (sideTokens.length > 0) {
        // Check if the first integer is a count (appears before 'D') or part of sides
        // For custom dice like d[1,2,3,5,8], all integers are sides
        // For custom dice like 2d[1,2,3,5,8], the first integer is count
        const hasExplicitCount = cst.children.Integer && cst.children.Integer.length > 0 && 
          cst.children.Integer.some((tok: any) => isIToken(tok) && 
            (tok.startOffset < (isIToken(cst.children.D?.[0]) ? cst.children.D[0].startOffset : Infinity)));
        
        if (hasExplicitCount && sideTokens.length > 1) {
          // First integer is count, rest are sides
          count = parseInt(sideTokens[0].image, 10);
          for (let i = 1; i < sideTokens.length; i++) {
            const sideToken = sideTokens[i] as IToken;
            sides.push(parseInt(sideToken.image, 10));
          }
        } else {
          // All integers are sides (no explicit count)
          for (const sideToken of sideTokens) {
            sides.push(parseInt(sideToken.image, 10));
          }
        }
      }
      
      // Extract modifiers (same as dice)
      const modifiers: ModifierNode[] = [];
      for (const key of Object.keys(cst.children)) {
        if (typeof window === 'undefined') {
          console.log(`[AST DEBUG] Checking key: ${key}`);
        }
        if ([
          'Kh','Kl','Dh','Dl','Kgt','Klt','R','Ro','Rlt','Rgt','Req','Explode','Mi','Ma','M','Gt','Lt','Eq','S','F','Cs','Cf','Sa','Sd','O'
        ].includes(key)) {
          if (key === 'O') {
            modifiers.push({ type: 'o' });
            continue;
          }
          if (typeof window === 'undefined') {
            console.log(`[AST DEBUG] Found modifier key: ${key}`);
          }
          const arr = cst.children[key];
          if (arr && arr.length > 0) {
            if (typeof window === 'undefined') {
              console.log(`[AST DEBUG] Modifier array length: ${arr.length}`);
            }
            for (const tok of arr) {
              if (typeof window === 'undefined') {
                console.log(`[AST DEBUG] Checking token:`, tok);
                if (isIToken(tok)) {
                  console.log(`[AST DEBUG] isIToken(tok): true`);
                  console.log(`[AST DEBUG] typeof tok.image: ${typeof tok.image}`);
                } else {
                  console.log(`[AST DEBUG] isIToken(tok): false`);
                }
              }
              if (tok && isIToken(tok) && typeof tok.image === 'string') {
                const raw = tok.image;
                let type: string | undefined = undefined;
                let value: string | undefined = undefined;
                // Use key to distinguish reroll vs explosion
                if (key === 'R' || key === 'Ro' || key === 'Rlt' || key === 'Rgt' || key === 'Req' || key === 'Rne') {
                  // Reroll modifiers
                  type = 'r';
                  let op: '>' | '<' | '>=' | '<=' | '=' | '!=' = '=';
                  let val = raw.slice(1);
                  if (key === 'Rne') { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<=')) { op = '<='; val = raw.slice(3); }
                  else if (raw.startsWith('r>=')) { op = '>='; val = raw.slice(3); }
                  else if (raw.startsWith('r!=')) { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<')) { op = '<'; val = raw.slice(2); }
                  else if (raw.startsWith('r>')) { op = '>'; val = raw.slice(2); }
                  else if (raw.startsWith('r=')) { op = '='; val = raw.slice(2); }
                  value = val;
                  modifiers.push({ type, value, operator: op });
                  continue;
                } else if (key === 'Explode') {
                  // Explosion modifiers
                  type = 'explode';
                  if (raw === '!') {
                    value = 'basic';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!!') {
                    value = 'compound';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!p') {
                    value = 'penetrating';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!r') {
                    value = 'recursive';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw.startsWith('!<')) {
                    value = 'less';
                    const match = raw.match(/!<(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '<' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!>')) {
                    value = 'greater';
                    const match = raw.match(/!>(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!=')) {
                    value = 'not_equal';
                    const match = raw.match(/!=(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '!=' as const });
                      continue;
                    }
                  } else if (raw.match(/!\d+/)) {
                    value = 'custom';
                    const match = raw.match(/!(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>=' as const });
                      continue;
                    }
                  }
                } else if (raw.startsWith('kh')) {
                  type = 'kh';
                  value = raw.slice(2);
                } else if (raw.startsWith('kl')) {
                  type = 'kl';
                  value = raw.slice(2);
                } else if (raw.startsWith('dh')) {
                  type = 'dh';
                  value = raw.slice(2);
                } else if (raw.startsWith('dl')) {
                  type = 'dl';
                  value = raw.slice(2);
                } else if (raw.startsWith('k>')) {
                  type = 'k>';
                  value = raw.slice(2);
                } else if (raw.startsWith('k<')) {
                  type = 'k<';
                  value = raw.slice(2);
                } else if (raw.startsWith('ro')) {
                  type = 'ro';
                  value = raw.slice(2);
                } else if (raw.startsWith('mi')) {
                  type = 'mi';
                  value = raw.slice(2);
                } else if (raw.startsWith('ma')) {
                  type = 'ma';
                  value = raw.slice(2);
                } else if (raw.startsWith('>')) {
                  type = 'gt';
                  value = raw.slice(1);
                } else if (raw.startsWith('<')) {
                  type = 'lt';
                  value = raw.slice(1);
                } else if (raw.startsWith('=')) {
                  type = 'eq';
                  value = raw.slice(1);
                } else if (raw.startsWith('cs')) {
                  type = 'cs';
                  value = raw.slice(2);
                } else if (raw.startsWith('cf')) {
                  type = 'cf';
                  value = raw.slice(2);
                } else if (raw === 'sa') {
                  type = 'sa';
                } else if (raw === 'sd') {
                  type = 'sd';
                } else if (raw === 's') {
                  type = 's';
                } else if (raw === 'f') {
                  type = 'f';
                } else if (raw === 'm') {
                  type = 'm';
                } else if (raw === 'e') {
                  type = 'e';
                  value = undefined;
                }
                if (type !== undefined && (key !== 'R' && key !== 'Ro' && key !== 'Rlt' && key !== 'Rgt' && key !== 'Req' && key !== 'Explode')) {
                  modifiers.push({ type, value });
                }
              }
            }
          }
        }
      }
      
      return { type: 'custom-dice', count, sides, modifiers } as unknown as DiceAstNode;
    }
    case 'groupedRoll': {
      // Extract expressions and modifiers
      const expressions = (cst.children.expression || []).map((expr: any) => cstToAst(expr, lexerTokens));
      const modifiers: ModifierNode[] = [];
      // Collect modifiers, including 'O' (roll once)
      for (const key of Object.keys(cst.children)) {
        if ([
          'Kh','Kl','Dh','Dl','Kgt','Klt','R','Ro','Rlt','Rgt','Req','Explode','Mi','Ma','M','Gt','Lt','Eq','S','F','Cs','Cf','Sa','Sd','O'
        ].includes(key)) {
          if (key === 'O') {
            modifiers.push({ type: 'o' });
            continue;
          }
          const arr = cst.children[key];
          if (arr && arr.length > 0) {
            for (const tok of arr) {
              if (tok && isIToken(tok) && typeof tok.image === 'string') {
                const raw = tok.image;
                let type: string | undefined = undefined;
                let value: string | undefined = undefined;
                // Use key to distinguish reroll vs explosion
                if (key === 'R' || key === 'Ro' || key === 'Rlt' || key === 'Rgt' || key === 'Req' || key === 'Rne') {
                  // Reroll modifiers
                  type = 'r';
                  let op: '>' | '<' | '>=' | '<=' | '=' | '!=' = '=';
                  let val = raw.slice(1);
                  if (key === 'Rne') { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<=')) { op = '<='; val = raw.slice(3); }
                  else if (raw.startsWith('r>=')) { op = '>='; val = raw.slice(3); }
                  else if (raw.startsWith('r!=')) { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<')) { op = '<'; val = raw.slice(2); }
                  else if (raw.startsWith('r>')) { op = '>'; val = raw.slice(2); }
                  else if (raw.startsWith('r=')) { op = '='; val = raw.slice(2); }
                  value = val;
                  modifiers.push({ type, value, operator: op });
                  continue;
                } else if (key === 'Explode') {
                  // Explosion modifiers
                  type = 'explode';
                  if (raw === '!') {
                    value = 'basic';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!!') {
                    value = 'compound';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!p') {
                    value = 'penetrating';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!r') {
                    value = 'recursive';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw.startsWith('!<')) {
                    value = 'less';
                    const match = raw.match(/!<(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '<' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!>')) {
                    value = 'greater';
                    const match = raw.match(/!>(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!=')) {
                    value = 'not_equal';
                    const match = raw.match(/!=(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '!=' as const });
                      continue;
                    }
                  } else if (raw.match(/!\d+/)) {
                    value = 'custom';
                    const match = raw.match(/!(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>=' as const });
                      continue;
                    }
                  }
                } else if (raw.startsWith('kh')) {
                  type = 'kh';
                  value = raw.slice(2);
                } else if (raw.startsWith('kl')) {
                  type = 'kl';
                  value = raw.slice(2);
                } else if (raw.startsWith('dh')) {
                  type = 'dh';
                  value = raw.slice(2);
                } else if (raw.startsWith('dl')) {
                  type = 'dl';
                  value = raw.slice(2);
                } else if (raw.startsWith('k>')) {
                  type = 'k>';
                  value = raw.slice(2);
                } else if (raw.startsWith('k<')) {
                  type = 'k<';
                  value = raw.slice(2);
                } else if (raw.startsWith('ro')) {
                  type = 'ro';
                  value = raw.slice(2);
                } else if (raw.startsWith('mi')) {
                  type = 'mi';
                  value = raw.slice(2);
                } else if (raw.startsWith('ma')) {
                  type = 'ma';
                  value = raw.slice(2);
                } else if (raw.startsWith('>')) {
                  type = 'gt';
                  value = raw.slice(1);
                } else if (raw.startsWith('<')) {
                  type = 'lt';
                  value = raw.slice(1);
                } else if (raw.startsWith('=')) {
                  type = 'eq';
                  value = raw.slice(1);
                } else if (raw.startsWith('cs')) {
                  type = 'cs';
                  value = raw.slice(2);
                } else if (raw.startsWith('cf')) {
                  type = 'cf';
                  value = raw.slice(2);
                } else if (raw === 'sa') {
                  type = 'sa';
                } else if (raw === 'sd') {
                  type = 'sd';
                } else if (raw === 's') {
                  type = 's';
                } else if (raw === 'f') {
                  type = 'f';
                } else if (raw === 'm') {
                  type = 'm';
                } else if (raw === 'e') {
                  type = 'e';
                  value = undefined;
                }
                if (type !== undefined && (key !== 'R' && key !== 'Ro' && key !== 'Rlt' && key !== 'Rgt' && key !== 'Req' && key !== 'Explode')) {
                  modifiers.push({ type, value });
                }
              }
            }
          }
        }
      }
      return { type: 'grouped-roll', expressions, modifiers };
    }
    case 'fudgeDice': {
      // [Integer]? dF[.variant] [modifiers...]
      let count = 1;
      let variant: 'basic' | '1' | '2' | '3' = 'basic';
      
      // Extract count
      if (cst.children.Integer && cst.children.Integer[0] && isIToken(cst.children.Integer[0])) {
        const countToken = cst.children.Integer[0] as IToken;
        count = parseInt(countToken.image, 10);
      }
      
      // Extract variant
      if (cst.children.FudgeDice && cst.children.FudgeDice[0] && isIToken(cst.children.FudgeDice[0])) {
        const fudgeToken = cst.children.FudgeDice[0] as IToken;
        const variantStr = fudgeToken.image.slice(3); // Remove 'dF.' prefix
        variant = variantStr as '1' | '2' | '3';
      } else if (cst.children.FudgeDiceBasic && cst.children.FudgeDiceBasic[0] && isIToken(cst.children.FudgeDiceBasic[0])) {
        variant = 'basic';
      }
      
      // Extract modifiers (same as dice)
      const modifiers: ModifierNode[] = [];
      for (const key of Object.keys(cst.children)) {
        if ([
          'Kh','Kl','Dh','Dl','Kgt','Klt','R','Ro','Rlt','Rgt','Req','Explode','Mi','Ma','M','Gt','Lt','Eq','S','F','Cs','Cf','Sa','Sd','O'
        ].includes(key)) {
          if (key === 'O') {
            modifiers.push({ type: 'o' });
            continue;
          }
          const arr = cst.children[key];
          if (arr && arr.length > 0) {
            for (const tok of arr) {
              if (tok && isIToken(tok) && typeof tok.image === 'string') {
                const raw = tok.image;
                let type: string | undefined = undefined;
                let value: string | undefined = undefined;
                // Use key to distinguish reroll vs explosion
                if (key === 'R' || key === 'Ro' || key === 'Rlt' || key === 'Rgt' || key === 'Req' || key === 'Rne') {
                  // Reroll modifiers
                  type = 'r';
                  let op: '>' | '<' | '>=' | '<=' | '=' | '!=' = '=';
                  let val = raw.slice(1);
                  if (key === 'Rne') { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<=')) { op = '<='; val = raw.slice(3); }
                  else if (raw.startsWith('r>=')) { op = '>='; val = raw.slice(3); }
                  else if (raw.startsWith('r!=')) { op = '!='; val = raw.slice(3); }
                  else if (raw.startsWith('r<')) { op = '<'; val = raw.slice(2); }
                  else if (raw.startsWith('r>')) { op = '>'; val = raw.slice(2); }
                  else if (raw.startsWith('r=')) { op = '='; val = raw.slice(2); }
                  value = val;
                  modifiers.push({ type, value, operator: op });
                  continue;
                } else if (key === 'Explode') {
                  // Explosion modifiers
                  type = 'explode';
                  if (raw === '!') {
                    value = 'basic';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!!') {
                    value = 'compound';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!p') {
                    value = 'penetrating';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw === '!r') {
                    value = 'recursive';
                    modifiers.push({ type, value });
                    continue;
                  } else if (raw.startsWith('!<')) {
                    value = 'less';
                    const match = raw.match(/!<(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '<' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!>')) {
                    value = 'greater';
                    const match = raw.match(/!>(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>' as const });
                      continue;
                    }
                  } else if (raw.startsWith('!=')) {
                    value = 'not_equal';
                    const match = raw.match(/!=(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '!=' as const });
                      continue;
                    }
                  } else if (raw.match(/!\d+/)) {
                    value = 'custom';
                    const match = raw.match(/!(\d+)/);
                    if (match) {
                      modifiers.push({ type, value, target: parseInt(match[1], 10), operator: '>=' as const });
                      continue;
                    }
                  }
                } else if (raw.startsWith('kh')) {
                  type = 'kh';
                  value = raw.slice(2);
                } else if (raw.startsWith('kl')) {
                  type = 'kl';
                  value = raw.slice(2);
                } else if (raw.startsWith('dh')) {
                  type = 'dh';
                  value = raw.slice(2);
                } else if (raw.startsWith('dl')) {
                  type = 'dl';
                  value = raw.slice(2);
                } else if (raw.startsWith('k>')) {
                  type = 'k>';
                  value = raw.slice(2);
                } else if (raw.startsWith('k<')) {
                  type = 'k<';
                  value = raw.slice(2);
                } else if (raw.startsWith('ro')) {
                  type = 'ro';
                  value = raw.slice(2);
                } else if (raw.startsWith('mi')) {
                  type = 'mi';
                  value = raw.slice(2);
                } else if (raw.startsWith('ma')) {
                  type = 'ma';
                  value = raw.slice(2);
                } else if (raw.startsWith('>')) {
                  type = 'gt';
                  value = raw.slice(1);
                } else if (raw.startsWith('<')) {
                  type = 'lt';
                  value = raw.slice(1);
                } else if (raw.startsWith('=')) {
                  type = 'eq';
                  value = raw.slice(1);
                } else if (raw.startsWith('cs')) {
                  type = 'cs';
                  value = raw.slice(2);
                } else if (raw.startsWith('cf')) {
                  type = 'cf';
                  value = raw.slice(2);
                } else if (raw === 'sa') {
                  type = 'sa';
                } else if (raw === 'sd') {
                  type = 'sd';
                } else if (raw === 's') {
                  type = 's';
                } else if (raw === 'f') {
                  type = 'f';
                } else if (raw === 'm') {
                  type = 'm';
                } else if (raw === 'e') {
                  type = 'e';
                  value = undefined;
                }
                if (type !== undefined && (key !== 'R' && key !== 'Ro' && key !== 'Rlt' && key !== 'Rgt' && key !== 'Req' && key !== 'Explode')) {
                  modifiers.push({ type, value });
                }
              }
            }
          }
        }
      }
      
      return { type: 'fudge-dice', count, variant, modifiers } as unknown as DiceAstNode;
    }
    case 'inlineRoll': {
      // InlineRoll CST node: extract the expression inside [[...]]
      const token = cst.children.InlineRoll && cst.children.InlineRoll[0];
      if (token && isIToken(token)) {
        // Remove the [[ and ]]
        const raw = token.image;
        const expr = raw.slice(2, -2).trim();
        return { type: 'inline-roll', expression: expr } as any;
      }
      // Fallback: empty inline roll
      return { type: 'inline-roll', expression: '' } as any;
    }
    default:
      // Fallback: try to parse as number
      if (cst.children && cst.children.Integer && cst.children.Integer[0] && isIToken(cst.children.Integer[0])) {
        const intToken = cst.children.Integer[0] as IToken;
        return { type: 'number', value: parseInt(intToken.image, 10) };
      }
      if (cst.children && cst.children.Decimal && cst.children.Decimal[0] && isIToken(cst.children.Decimal[0])) {
        const decimalToken = cst.children.Decimal[0] as IToken;
        return { type: 'number', value: parseFloat(decimalToken.image) };
      }
      // Recursively visit all children that are CST nodes
      for (const key of Object.keys(cst.children)) {
        const arr = cst.children[key];
        if (Array.isArray(arr)) {
          for (const child of arr) {
            if (child && typeof child === 'object' && 'name' in child) {
              const ast = cstToAst(child as CstNode, lexerTokens);
              if (ast) return ast;
            }
          }
        }
      }
      return { type: 'number', value: 0 };
  }
  // If all else fails
  return { type: 'number', value: 0 };
} 