import { CstParser, Lexer } from 'chevrotain';
import { rollQueriesLexerModes, QueryStart, Pipe, Comma, EscapedChar, Text, WhiteSpace } from './tokens';
import { RCurly } from '../../core/tokens';

export class RollQueryParser extends CstParser {
  public rollQuery: any;
  constructor() {
    // Use all tokens from both modes for the parser
    const allTokens = [WhiteSpace, QueryStart, Pipe, Comma, EscapedChar, Text, RCurly];
    super(allTokens, { recoveryEnabled: true });
    const $ = this;
    this.rollQuery = this.RULE('rollQuery', function () {
      $.CONSUME(QueryStart);
      $.AT_LEAST_ONE_SEP({
        SEP: Pipe,
        DEF: () => {
          $.MANY(() => {
            $.OR([
              { ALT: () => $.CONSUME(Text) },
              { ALT: () => $.CONSUME(EscapedChar) },
              { ALT: () => $.CONSUME(Comma) },
              { ALT: () => $.CONSUME(WhiteSpace) },
            ]);
          });
        },
      });
      $.CONSUME(RCurly);
    });
    this.performSelfAnalysis();
  }
}

const RollQueryLexer = new Lexer(rollQueriesLexerModes);
const parserInstance = new RollQueryParser();

export function parseRollQueryExpression(text: string): any {
  const lexResult = RollQueryLexer.tokenize(text);
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.rollQuery();
  if (parserInstance.errors.length > 0) {
    throw new Error('Parsing errors detected! ' + parserInstance.errors[0].message);
  }
  return cst;
} 