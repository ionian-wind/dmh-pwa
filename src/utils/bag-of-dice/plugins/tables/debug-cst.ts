import { parseTableExpression } from './parser';
import { cstToAst } from '../../utils/cstAstConverter';
import { tableCstToAstHandlers } from './converters';
import { allTableTokens } from './tokens';
import { Lexer } from 'chevrotain';

const TableLexer = new Lexer(allTableTokens);

const queries = [
  '1t[loot]',
  't[loot]',
  '2t[magic_items]',
  '  3t[table_name]  ',
  '10t[treasure]',
];

for (const expr of queries) {
  try {
    console.log('---');
    console.log('Expression:', JSON.stringify(expr));
    const lexResult = TableLexer.tokenize(expr);
    console.log('Tokens:', lexResult.tokens.map(t => ({ type: t.tokenType.name, image: t.image })));
    const cst = parseTableExpression(expr);
    console.log('CST:', JSON.stringify(cst, null, 2));
    const ast = cstToAst(cst, tableCstToAstHandlers);
    console.log('AST:', JSON.stringify(ast, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
} 