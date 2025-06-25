import { CstParser, Lexer } from 'chevrotain';
import {
  allDiceTokens,
  D, DPercent, DF, NumberLiteral, LBracket, RBracket, LCurly, RCurly, Comma, LParen, RParen, Identifier,
  Sa, Sd, S, F, M, E, Kh, Kl, Dh, Dl, Reroll, Explode, Mi, Ma, Success, Failure, Equal, Cs, Cf, Kgt, Klt, O
} from './tokens';
import * as T from './tokens';

const modifierTokens = [Sa, Sd, S, F, M, E, Kh, Kl, Dh, Dl, Reroll, Explode, Mi, Ma, Success, Failure, Equal, Cs, Cf, Kgt, Klt, O];

export class DiceParser extends CstParser {
  public diceWithModifiers: any;
  public diceExpression: any;
  public groupedDice: any;
  public ndxDice: any;
  public dxDice: any;
  public dPercentDice: any;
  public dFudgeDice: any;
  public customDiceExpr: any;
  public computedDice: any;
  public computedExpr: any;
  public modifier: any;
  constructor() {
    super(T.allDiceTokens, { recoveryEnabled: true });
    const $ = this;

    $.RULE('diceWithModifiers', () => {
      $.SUBRULE($.diceExpression);
      $.MANY(() => {
        $.SUBRULE($.modifier);
      });
    });

    $.RULE('diceExpression', () => {
      return $.OR([
        { ALT: () => $.SUBRULE($.groupedDice) },
        { ALT: () => $.SUBRULE($.ndxDice) },
        { ALT: () => $.SUBRULE($.dxDice) },
        { ALT: () => $.SUBRULE($.dPercentDice) },
        { ALT: () => $.SUBRULE($.dFudgeDice) },
        { ALT: () => $.SUBRULE($.customDiceExpr) },
        { ALT: () => $.SUBRULE($.computedDice) },
      ]);
    });

    $.RULE('groupedDice', () => {
      $.CONSUME(LCurly);
      $.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => $.SUBRULE($.diceExpression) });
      $.CONSUME(RCurly);
    });

    $.RULE('ndxDice', () => {
      $.CONSUME(NumberLiteral);
      $.CONSUME(D);
      $.CONSUME2(NumberLiteral);
    });

    $.RULE('dxDice', () => {
      $.CONSUME(D);
      $.CONSUME(NumberLiteral);
    });

    $.RULE('dPercentDice', () => {
      $.OPTION(() => $.CONSUME(NumberLiteral));
      $.CONSUME(DPercent);
    });

    $.RULE('dFudgeDice', () => {
      $.OPTION(() => $.CONSUME(NumberLiteral));
      $.CONSUME(DF);
    });

    $.RULE('customDiceExpr', () => {
      $.OPTION(() => $.CONSUME1(NumberLiteral));
      $.CONSUME(D);
      $.CONSUME(LBracket);
      $.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => $.CONSUME2(NumberLiteral) });
      $.CONSUME(RBracket);
    });

    $.RULE('computedDice', () => {
      $.OR([
        { ALT: () => { $.SUBRULE($.computedExpr); $.CONSUME1(D); $.CONSUME1(NumberLiteral); } },
        { ALT: () => { $.CONSUME2(NumberLiteral); $.CONSUME2(D); $.SUBRULE2($.computedExpr); } },
      ]);
    });

    $.RULE('computedExpr', () => {
      $.CONSUME(LParen);
      $.CONSUME(NumberLiteral);
      $.CONSUME(RParen);
    });

    $.RULE('modifier', () => {
      $.OR(modifierTokens.map(tok => ({ ALT: () => $.CONSUME(tok) })));
    });

    this.performSelfAnalysis();
  }
}

const DiceLexer = new Lexer(allDiceTokens);
const parserInstance = new DiceParser();

export function parseDiceExpression(text: string): any {
  const lexResult = DiceLexer.tokenize(text);
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.diceWithModifiers();
  if (parserInstance.errors.length > 0) {
    throw new Error('Parsing errors detected! ' + parserInstance.errors[0].message);
  }
  return cst;
} 