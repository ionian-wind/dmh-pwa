import { CstParser, Lexer, ParserMethod, CstNode } from 'chevrotain';
import * as tokens from './tokens';

// Create a Chevrotain Lexer for dice expressions
export const DiceLexer = new Lexer(tokens.AllTokens);

export class DiceRollerDiceParser extends CstParser {
  expression: ParserMethod<[], CstNode> = undefined as any;
  additive: ParserMethod<[], CstNode> = undefined as any;
  multiplicative: ParserMethod<[], CstNode> = undefined as any;
  primary: ParserMethod<[], CstNode> = undefined as any;
  dice: ParserMethod<[], CstNode> = undefined as any;
  tableRoll: ParserMethod<[], CstNode> = undefined as any;
  functionCall: ParserMethod<[], CstNode> = undefined as any;
  groupedRoll: ParserMethod<[], CstNode> = undefined as any;
  customDice: ParserMethod<[], CstNode> = undefined as any;
  exponential: ParserMethod<[], CstNode> = undefined as any;
  fudgeDice: ParserMethod<[], CstNode> = undefined as any;
  modifiers: ParserMethod<[], CstNode> = undefined as any;
  inlineRoll: ParserMethod<[], CstNode> = undefined as any;

  constructor() {
    super(tokens.AllTokens, { recoveryEnabled: true });
    const $ = this;
    // Bind rules to class fields for Chevrotain
    $.expression = $.RULE('expression', () => {
      return $.SUBRULE($.additive);
    });
    $.additive = $.RULE('additive', () => {
      let left = $.SUBRULE($.exponential);
      $.MANY(() => {
        $.OR([
          { ALT: () => { $.CONSUME(tokens.Plus); $.SUBRULE2($.exponential); } },
          { ALT: () => { $.CONSUME(tokens.Minus); $.SUBRULE3($.exponential); } },
        ]);
      });
      return left;
    });
    $.multiplicative = $.RULE('multiplicative', () => {
      let left = $.SUBRULE($.primary);
      $.MANY(() => {
        $.OR([
          { ALT: () => { $.CONSUME(tokens.Multiply); $.SUBRULE2($.primary); } },
          { ALT: () => { $.CONSUME(tokens.Divide); $.SUBRULE3($.primary); } },
          { ALT: () => { $.CONSUME(tokens.Modulo); $.SUBRULE4($.primary); } },
        ]);
      });
      return left;
    });
    $.exponential = $.RULE('exponential', () => {
      let left = $.SUBRULE($.multiplicative);
      $.MANY(() => {
        $.CONSUME(tokens.Exponent);
        $.SUBRULE2($.exponential);
      });
      return left;
    });
    $.functionCall = $.RULE('functionCall', () => {
      $.OR([
        { ALT: () => $.CONSUME(tokens.Floor) },
        { ALT: () => $.CONSUME(tokens.Ceil) },
        { ALT: () => $.CONSUME(tokens.Round) },
        { ALT: () => $.CONSUME(tokens.Abs) },
        { ALT: () => $.CONSUME(tokens.Min) },
        { ALT: () => $.CONSUME(tokens.Max) },
      ]);
      $.CONSUME(tokens.LParen);
      $.AT_LEAST_ONE_SEP({
        SEP: tokens.Comma,
        DEF: () => $.SUBRULE($.expression)
      });
      $.CONSUME(tokens.RParen);
    });
    $.tableRoll = $.RULE('tableRoll', () => {
      $.OPTION(() => {
        $.CONSUME(tokens.Integer);
      });
      $.CONSUME(tokens.TableName);
    });
    $.groupedRoll = $.RULE('groupedRoll', () => {
      $.CONSUME(tokens.LBrace);
      $.AT_LEAST_ONE_SEP({
        SEP: tokens.Comma,
        DEF: () => $.SUBRULE($.expression)
      });
      $.CONSUME(tokens.RBrace);
      $.MANY(() => {
        $.OR([
          { ALT: () => $.CONSUME(tokens.Kh) },
          { ALT: () => $.CONSUME(tokens.Kl) },
          { ALT: () => $.CONSUME(tokens.Dh) },
          { ALT: () => $.CONSUME(tokens.Dl) },
          { ALT: () => $.CONSUME(tokens.Kgt) },
          { ALT: () => $.CONSUME(tokens.Klt) },
          { ALT: () => $.CONSUME(tokens.R) },
          { ALT: () => $.CONSUME(tokens.Ro) },
          { ALT: () => $.CONSUME(tokens.Rlt) },
          { ALT: () => $.CONSUME(tokens.Rgt) },
          { ALT: () => $.CONSUME(tokens.Req) },
          { ALT: () => $.CONSUME(tokens.Rne) },
          { ALT: () => $.CONSUME(tokens.Explode) },
          { ALT: () => $.CONSUME(tokens.Mi) },
          { ALT: () => $.CONSUME(tokens.Ma) },
          { ALT: () => $.CONSUME(tokens.M) },
          { ALT: () => $.CONSUME(tokens.Gt) },
          { ALT: () => $.CONSUME(tokens.Lt) },
          { ALT: () => $.CONSUME(tokens.Eq) },
          { ALT: () => $.CONSUME(tokens.E) },
          { ALT: () => $.CONSUME(tokens.S) },
          { ALT: () => $.CONSUME(tokens.F) },
          { ALT: () => $.CONSUME(tokens.Cs) },
          { ALT: () => $.CONSUME(tokens.Cf) },
          { ALT: () => $.CONSUME(tokens.Sa) },
          { ALT: () => $.CONSUME(tokens.Sd) },
          { ALT: () => $.CONSUME(tokens.O) },
        ]);
      });
    });
    $.customDice = $.RULE('customDice', () => {
      $.OPTION(() => {
        $.CONSUME(tokens.Integer);
      });
      $.CONSUME(tokens.D);
      $.CONSUME(tokens.LBracket);
      $.AT_LEAST_ONE_SEP({
        SEP: tokens.Comma,
        DEF: () => $.CONSUME2(tokens.Integer)
      });
      $.CONSUME(tokens.RBracket);
      $.MANY(() => {
        $.OR([
          { ALT: () => $.CONSUME(tokens.Kh) },
          { ALT: () => $.CONSUME(tokens.Kl) },
          { ALT: () => $.CONSUME(tokens.Dh) },
          { ALT: () => $.CONSUME(tokens.Dl) },
          { ALT: () => $.CONSUME(tokens.Kgt) },
          { ALT: () => $.CONSUME(tokens.Klt) },
          { ALT: () => $.CONSUME(tokens.R) },
          { ALT: () => $.CONSUME(tokens.Ro) },
          { ALT: () => $.CONSUME(tokens.Rlt) },
          { ALT: () => $.CONSUME(tokens.Rgt) },
          { ALT: () => $.CONSUME(tokens.Req) },
          { ALT: () => $.CONSUME(tokens.Rne) },
          { ALT: () => $.CONSUME(tokens.Explode) },
          { ALT: () => $.CONSUME(tokens.Mi) },
          { ALT: () => $.CONSUME(tokens.Ma) },
          { ALT: () => $.CONSUME(tokens.M) },
          { ALT: () => $.CONSUME(tokens.Gt) },
          { ALT: () => $.CONSUME(tokens.Lt) },
          { ALT: () => $.CONSUME(tokens.Eq) },
          { ALT: () => $.CONSUME(tokens.E) },
          { ALT: () => $.CONSUME(tokens.S) },
          { ALT: () => $.CONSUME(tokens.F) },
          { ALT: () => $.CONSUME(tokens.Cs) },
          { ALT: () => $.CONSUME(tokens.Cf) },
          { ALT: () => $.CONSUME(tokens.Sa) },
          { ALT: () => $.CONSUME(tokens.Sd) },
          { ALT: () => $.CONSUME(tokens.O) },
        ]);
      });
    });
    $.dice = $.RULE('dice', () => {
      $.OPTION(() => {
        $.CONSUME(tokens.Integer);
      });
      $.CONSUME(tokens.D);
      $.CONSUME2(tokens.Integer);
      $.OPTION2(() => {
        $.CONSUME(tokens.LBracket);
        $.CONSUME(tokens.LabelText);
        $.CONSUME(tokens.RBracket);
      });
      $.MANY(() => {
        $.OR([
          { ALT: () => $.CONSUME(tokens.Kh) },
          { ALT: () => $.CONSUME(tokens.Kl) },
          { ALT: () => $.CONSUME(tokens.Dh) },
          { ALT: () => $.CONSUME(tokens.Dl) },
          { ALT: () => $.CONSUME(tokens.Kgt) },
          { ALT: () => $.CONSUME(tokens.Klt) },
          { ALT: () => $.CONSUME(tokens.R) },
          { ALT: () => $.CONSUME(tokens.Ro) },
          { ALT: () => $.CONSUME(tokens.Rlt) },
          { ALT: () => $.CONSUME(tokens.Rgt) },
          { ALT: () => $.CONSUME(tokens.Req) },
          { ALT: () => $.CONSUME(tokens.Rne) },
          { ALT: () => $.CONSUME(tokens.Explode) },
          { ALT: () => $.CONSUME(tokens.Mi) },
          { ALT: () => $.CONSUME(tokens.Ma) },
          { ALT: () => $.CONSUME(tokens.M) },
          { ALT: () => $.CONSUME(tokens.Gt) },
          { ALT: () => $.CONSUME(tokens.Lt) },
          { ALT: () => $.CONSUME(tokens.Eq) },
          { ALT: () => $.CONSUME(tokens.E) },
          { ALT: () => $.CONSUME(tokens.S) },
          { ALT: () => $.CONSUME(tokens.F) },
          { ALT: () => $.CONSUME(tokens.Cs) },
          { ALT: () => $.CONSUME(tokens.Cf) },
          { ALT: () => $.CONSUME(tokens.Sa) },
          { ALT: () => $.CONSUME(tokens.Sd) },
          { ALT: () => $.CONSUME(tokens.O) },
        ]);
      });
    });
    $.inlineRoll = $.RULE('inlineRoll', () => {
      $.CONSUME(tokens.InlineRoll);
    });
    $.primary = $.RULE('primary', () => {
      return $.OR([
        { ALT: () => $.SUBRULE($.functionCall) },
        { ALT: () => $.SUBRULE($.groupedRoll) },
        { ALT: () => $.SUBRULE($.customDice) },
        { ALT: () => $.SUBRULE($.dice) },
        { ALT: () => $.SUBRULE($.fudgeDice) },
        { ALT: () => $.SUBRULE($.tableRoll) },
        { ALT: () => $.CONSUME(tokens.Decimal) },
        { ALT: () => $.CONSUME(tokens.Integer) },
        { ALT: () => $.CONSUME(tokens.Macro) },
        { ALT: () => $.SUBRULE($.inlineRoll) },
        { ALT: () => {
          $.CONSUME(tokens.Minus);
          $.SUBRULE($.primary);
        } },
        { ALT: () => {
          $.CONSUME(tokens.LParen);
          $.SUBRULE($.expression);
          $.CONSUME(tokens.RParen);
        } },
      ]);
    });
    $.fudgeDice = $.RULE('fudgeDice', () => {
      $.OPTION(() => {
        $.CONSUME(tokens.Integer);
      });
      $.OR([
        { ALT: () => $.CONSUME(tokens.FudgeDice) },
        { ALT: () => $.CONSUME(tokens.FudgeDiceBasic) },
      ]);
    });
    $.modifiers = $.RULE('modifiers', () => {
      $.MANY(() => {
        $.OR([
          { ALT: () => $.CONSUME(tokens.Kh) },
          { ALT: () => $.CONSUME(tokens.Kl) },
          { ALT: () => $.CONSUME(tokens.Dh) },
          { ALT: () => $.CONSUME(tokens.Dl) },
          { ALT: () => $.CONSUME(tokens.Kgt) },
          { ALT: () => $.CONSUME(tokens.Klt) },
          { ALT: () => $.CONSUME(tokens.R) },
          { ALT: () => $.CONSUME(tokens.Ro) },
          { ALT: () => $.CONSUME(tokens.Rlt) },
          { ALT: () => $.CONSUME(tokens.Rgt) },
          { ALT: () => $.CONSUME(tokens.Req) },
          { ALT: () => $.CONSUME(tokens.Rne) },
          { ALT: () => $.CONSUME(tokens.Explode) },
          { ALT: () => $.CONSUME(tokens.Mi) },
          { ALT: () => $.CONSUME(tokens.Ma) },
          { ALT: () => $.CONSUME(tokens.M) },
          { ALT: () => $.CONSUME(tokens.Gt) },
          { ALT: () => $.CONSUME(tokens.Lt) },
          { ALT: () => $.CONSUME(tokens.Eq) },
          { ALT: () => $.CONSUME(tokens.E) },
          { ALT: () => $.CONSUME(tokens.S) },
          { ALT: () => $.CONSUME(tokens.F) },
          { ALT: () => $.CONSUME(tokens.Cs) },
          { ALT: () => $.CONSUME(tokens.Cf) },
          { ALT: () => $.CONSUME(tokens.Sa) },
          { ALT: () => $.CONSUME(tokens.Sd) },
          { ALT: () => $.CONSUME(tokens.O) },
        ]);
      });
    });
    this.performSelfAnalysis();
  }
}

export function parseDiceExpression(input: string) {
  // Tokenize input
  const lexResult = DiceLexer.tokenize(input);
  const parser = new DiceRollerDiceParser();
  parser.input = lexResult.tokens;
  const cst = parser.expression();
  return { cst, lexResult, parser };
} 