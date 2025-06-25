import { CstParser, Lexer } from 'chevrotain';
import { allTableTokens, NumberLiteral, TableRollStart, RBracket, Identifier, WhiteSpace } from './tokens';

export class TableParser extends CstParser {
  public tableRoll: any;
  constructor() {
    super(allTableTokens, { recoveryEnabled: true });
    const $ = this;
    $.tableRoll = $.RULE('tableRoll', function () {
      $.MANY1(() => $.CONSUME1(WhiteSpace)); // allow leading whitespace
      // Optional number of rolls (N)
      $.OPTION(() => {
        $.CONSUME(NumberLiteral);
      });
      $.CONSUME(TableRollStart);
      $.CONSUME(Identifier);
      $.CONSUME(RBracket);
      $.MANY2(() => $.CONSUME2(WhiteSpace)); // allow trailing whitespace
    });
    this.performSelfAnalysis();
  }
}

const TableLexer = new Lexer(allTableTokens);
const parserInstance = new TableParser();

export function parseTableExpression(text: string): any {
  const lexResult = TableLexer.tokenize(text);
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.tableRoll();
  if (parserInstance.errors.length > 0) {
    throw new Error('Parsing errors detected! ' + parserInstance.errors[0].message);
  }
  return cst;
} 