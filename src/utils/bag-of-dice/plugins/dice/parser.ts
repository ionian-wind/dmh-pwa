import { CstParser, Lexer } from 'chevrotain';
import {
  allDiceTokens,
  DiceD, DiceDPercent, DiceDF, DiceNumberLiteral, LBracket, RBracket, LCurly, RCurly, Comma, LParen, RParen, DiceIdentifier,
  DiceSa, DiceSd, DiceS, DiceF, DiceM, DiceE, DiceKh, DiceKl, DiceDh, DiceDl, DiceReroll, DiceExplode, DiceMi, DiceMa, DiceSuccess, DiceFailure, DiceEqual, DiceCs, DiceCf, DiceKgt, DiceKlt, DiceO
} from './tokens';
import * as T from './tokens';

const modifierTokens = [DiceSa, DiceSd, DiceS, DiceF, DiceM, DiceE, DiceKh, DiceKl, DiceDh, DiceDl, DiceReroll, DiceExplode, DiceMi, DiceMa, DiceSuccess, DiceFailure, DiceEqual, DiceCs, DiceCf, DiceKgt, DiceKlt, DiceO];

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
      $.CONSUME(DiceNumberLiteral);
      $.CONSUME(DiceD);
      $.CONSUME2(DiceNumberLiteral);
    });

    $.RULE('dxDice', () => {
      $.CONSUME(DiceD);
      $.CONSUME(DiceNumberLiteral);
    });

    $.RULE('dPercentDice', () => {
      $.OPTION(() => $.CONSUME(DiceNumberLiteral));
      $.CONSUME(DiceDPercent);
    });

    $.RULE('dFudgeDice', () => {
      $.OPTION(() => $.CONSUME(DiceNumberLiteral));
      $.CONSUME(DiceDF);
    });

    $.RULE('customDiceExpr', () => {
      $.OPTION(() => $.CONSUME1(DiceNumberLiteral));
      $.CONSUME(DiceD);
      $.CONSUME(LBracket);
      $.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => $.CONSUME2(DiceNumberLiteral) });
      $.CONSUME(RBracket);
    });

    $.RULE('computedDice', () => {
      $.OR([
        { ALT: () => { $.SUBRULE($.computedExpr); $.CONSUME1(DiceD); $.CONSUME1(DiceNumberLiteral); } },
        { ALT: () => { $.CONSUME2(DiceNumberLiteral); $.CONSUME2(DiceD); $.SUBRULE2($.computedExpr); } },
      ]);
    });

    $.RULE('computedExpr', () => {
      $.CONSUME(LParen);
      $.CONSUME(DiceNumberLiteral);
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