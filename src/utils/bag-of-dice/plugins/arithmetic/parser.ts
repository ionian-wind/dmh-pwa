import { CstParser, IToken, Lexer } from 'chevrotain';
import * as T from './tokens';
import { debugLog } from '../../index';
import { allArithmeticTokens } from './tokens';
import { LParen, RParen, WhiteSpace, Comma } from '../../core/tokens';

// AST node types for arithmetic
export type ArithmeticAST =
  | { type: 'Add' | 'Sub' | 'Mul' | 'Div' | 'Mod' | 'Pow'; left: ArithmeticAST; right: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'UnaryPlus' | 'UnaryMinus'; value: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'Floor' | 'Ceil' | 'Round' | 'Abs'; arg: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'NumberLiteral'; value: number; plugin: 'arithmetic' };

export class ArithmeticParser extends CstParser {
  // Rule properties for Chevrotain
  public expression: any;
  public additionExpression: any;
  public multiplicationExpression: any;
  public exponentExpression: any;
  public unaryExpression: any;
  public functionExpression: any;
  public atomicExpression: any;
  public entry: any;

  constructor() {
    super(T.allArithmeticTokens, { recoveryEnabled: true });
    const $ = this;

    this.entry = this.RULE('entry', function () {
      return $.SUBRULE($.expression);
    });

    this.expression = this.RULE('expression', function () {
      debugLog('Enter rule: expression');
      const result = $.SUBRULE($.additionExpression);
      debugLog('Exit rule: expression', result);
      return result;
    });

    this.additionExpression = this.RULE('additionExpression', function () {
      debugLog('Enter rule: additionExpression');
      let value = $.SUBRULE($.multiplicationExpression);
      $.MANY(() => {
        $.OR([
          { ALT: () => {
            $.CONSUME(T.ArithmeticPlus);
            value = $.ACTION(() => ({ type: 'Add', left: value, right: $.SUBRULE2($.multiplicationExpression), plugin: 'arithmetic' }) as any);
          }},
          { ALT: () => {
            $.CONSUME(T.ArithmeticMinus);
            value = $.ACTION(() => ({ type: 'Sub', left: value, right: $.SUBRULE3($.multiplicationExpression), plugin: 'arithmetic' }) as any);
          }}
        ]);
      });
      debugLog('Exit rule: additionExpression', value);
      return value;
    });

    this.multiplicationExpression = this.RULE('multiplicationExpression', function () {
      debugLog('Enter rule: multiplicationExpression');
      let value = $.SUBRULE($.exponentExpression);
      $.MANY(() => {
        $.OR([
          { ALT: () => {
            $.CONSUME(T.ArithmeticMult);
            value = $.ACTION(() => ({ type: 'Mul', left: value, right: $.SUBRULE2($.exponentExpression), plugin: 'arithmetic' }) as any);
          }},
          { ALT: () => {
            $.CONSUME(T.ArithmeticDiv);
            value = $.ACTION(() => ({ type: 'Div', left: value, right: $.SUBRULE3($.exponentExpression), plugin: 'arithmetic' }) as any);
          }},
          { ALT: () => {
            $.CONSUME(T.ArithmeticMod);
            value = $.ACTION(() => ({ type: 'Mod', left: value, right: $.SUBRULE4($.exponentExpression), plugin: 'arithmetic' }) as any);
          }}
        ]);
      });
      debugLog('Exit rule: multiplicationExpression', value);
      return value;
    });

    this.exponentExpression = this.RULE('exponentExpression', function () {
      debugLog('Enter rule: exponentExpression');
      let value = $.SUBRULE($.unaryExpression);
      $.MANY(() => {
        $.CONSUME(T.ArithmeticPow);
        value = $.ACTION(() => ({ type: 'Pow', left: value, right: $.SUBRULE2($.unaryExpression), plugin: 'arithmetic' }) as any);
      });
      debugLog('Exit rule: exponentExpression', value);
      return value;
    });

    this.unaryExpression = this.RULE('unaryExpression', function () {
      debugLog('Enter rule: unaryExpression');
      const result = $.OR([
        { ALT: () => {
          $.CONSUME(T.ArithmeticPlus);
          return $.ACTION(() => ({ type: 'UnaryPlus', value: $.SUBRULE($.unaryExpression), plugin: 'arithmetic' }) as any);
        }},
        { ALT: () => {
          $.CONSUME(T.ArithmeticMinus);
          return $.ACTION(() => ({ type: 'UnaryMinus', value: $.SUBRULE2($.unaryExpression), plugin: 'arithmetic' }) as any);
        }},
        { ALT: () => $.SUBRULE($.functionExpression) },
        { ALT: () => $.SUBRULE($.atomicExpression) }
      ]);
      debugLog('Exit rule: unaryExpression', result);
      return result;
    });

    this.functionExpression = this.RULE('functionExpression', function () {
      debugLog('Enter rule: functionExpression');
      const result = $.OR([
        { ALT: () => {
          $.CONSUME(T.ArithmeticFloor);
          $.CONSUME1(LParen);
          const arg = $.SUBRULE($.expression);
          $.CONSUME1(RParen);
          return $.ACTION(() => ({ type: 'Floor', arg, plugin: 'arithmetic' }) as any);
        }},
        { ALT: () => {
          $.CONSUME(T.ArithmeticCeil);
          $.CONSUME2(LParen);
          const arg = $.SUBRULE2($.expression);
          $.CONSUME2(RParen);
          return $.ACTION(() => ({ type: 'Ceil', arg, plugin: 'arithmetic' }) as any);
        }},
        { ALT: () => {
          $.CONSUME(T.ArithmeticRound);
          $.CONSUME3(LParen);
          const arg = $.SUBRULE3($.expression);
          $.CONSUME3(RParen);
          return $.ACTION(() => ({ type: 'Round', arg, plugin: 'arithmetic' }) as any);
        }},
        { ALT: () => {
          $.CONSUME(T.ArithmeticAbs);
          $.CONSUME4(LParen);
          const arg = $.SUBRULE4($.expression);
          $.CONSUME4(RParen);
          return $.ACTION(() => ({ type: 'Abs', arg, plugin: 'arithmetic' }) as any);
        }}
      ]);
      debugLog('Exit rule: functionExpression', result);
      return result;
    });

    this.atomicExpression = this.RULE('atomicExpression', function () {
      debugLog('Enter rule: atomicExpression');
      const result = $.OR([
        { ALT: () => {
          $.CONSUME(LParen);
          const value = $.SUBRULE($.expression);
          $.CONSUME(RParen);
          return value;
        }},
        { ALT: () => {
          const num = $.CONSUME(T.ArithmeticNumberLiteral);
          return $.ACTION(() => ({ type: 'NumberLiteral', value: parseFloat(num.image), plugin: 'arithmetic' }) as any);
        }}
      ]);
      debugLog('Exit rule: atomicExpression', result);
      return result;
    });

    this.performSelfAnalysis();
  }

  // Entry point for parsing
  public parse() {
    return this.expression();
  }
}

const ArithmeticLexer = new Lexer(allArithmeticTokens);
const parserInstance = new ArithmeticParser();

// Now returns CST. Use CST-to-AST converter for AST.
export function parseArithmeticExpression(text: string): any {
  const lexResult = ArithmeticLexer.tokenize(text);
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.entry();
  if (parserInstance.errors.length > 0) {
    throw new Error('Parsing errors detected! ' + parserInstance.errors[0].message);
  }
  return cst;
} 