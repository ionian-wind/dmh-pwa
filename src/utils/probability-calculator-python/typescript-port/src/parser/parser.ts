import { createTokenInstance, Lexer, Token, CstParser } from 'chevrotain';
import {
  OUTPUT,
  FUNCTION,
  LOOP,
  OVER,
  NAMED,
  SET,
  TO,
  IF,
  ELSE,
  RESULT,
  PLUS,
  MINUS,
  TIMES,
  DIVIDE,
  POWER,
  COLON,
  LESS,
  GREATER,
  EQUALS,
  NOTEQUALS,
  AT,
  HASH,
  OR,
  AND,
  EXCLAMATION,
  DOUBLE_DOT,
  DOT,
  COMMA,
  LPAREN,
  RPAREN,
  LBRACE,
  RBRACE,
  LBRACKET,
  RBRACKET,
  UPPERNAME,
  D_OP,
  LOWERNAME,
  NUMBER,
  INSTRING,
} from './lexer';

export interface Node {
  type: string;
  value?: unknown;
  children?: Node[];
}

export class CParser extends CstParser {
  constructor() {
    super([
      OUTPUT,
      FUNCTION,
      LOOP,
      OVER,
      NAMED,
      SET,
      TO,
      IF,
      ELSE,
      RESULT,
      PLUS,
      MINUS,
      TIMES,
      DIVIDE,
      POWER,
      COLON,
      LESS,
      GREATER,
      EQUALS,
      NOTEQUALS,
      AT,
      HASH,
      OR,
      AND,
      EXCLAMATION,
      DOUBLE_DOT,
      DOT,
      COMMA,
      LPAREN,
      RPAREN,
      LBRACE,
      RBRACE,
      LBRACKET,
      RBRACKET,
      UPPERNAME,
      D_OP,
      LOWERNAME,
      NUMBER,
      INSTRING,
    ]);

    const $ = this;

    $.RULE('program', () => {
      $.SUBRULE($.statements);
    });

    $.RULE('statements', () => {
      $.MANY(() => {
        $.SUBRULE($.statement);
      });
    });

    $.RULE('statement', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.outputStatement) },
        { ALT: () => $.SUBRULE($.functionStatement) },
        { ALT: () => $.SUBRULE($.variableDeclaration) },
      ]);
    });

    $.RULE('outputStatement', () => {
      $.CONSUME(OUTPUT);
      $.SUBRULE($.expression);
    });

    $.RULE('functionStatement', () => {
      $.CONSUME(FUNCTION);
      $.CONSUME(UPPERNAME);
      $.CONSUME(LPAREN);
      $.OPTION(() => {
        $.SUBRULE($.parameters);
      });
      $.CONSUME(RPAREN);
      $.CONSUME(LBRACE);
      $.SUBRULE($.statements);
      $.CONSUME(RBRACE);
    });

    $.RULE('variableDeclaration', () => {
      $.CONSUME(UPPERNAME);
      $.CONSUME(EQUALS);
      $.SUBRULE($.expression);
    });

    $.RULE('parameters', () => {
      $.COMMA_SEP($.expression);
    });

    $.RULE('expression', () => {
      $.OR([{ ALT: () => $.SUBRULE($.additiveExpression) }]);
    });

    $.RULE('additiveExpression', () => {
      $.SUBRULE($.multiplicativeExpression, { MIN: 0 });
      $.MANY(() => {
        $.CONSUME(PLUS);
        $.SUBRULE($.multiplicativeExpression, { MIN: 1 });
      });
    });

    $.RULE('multiplicativeExpression', () => {
      $.SUBRULE($.unaryExpression, { MIN: 0 });
      $.MANY(() => {
        $.CONSUME(TIMES);
        $.SUBRULE($.unaryExpression, { MIN: 1 });
      });
    });

    $.RULE('unaryExpression', () => {
      $.OR([{ ALT: () => $.SUBRULE($.primaryExpression) }]);
    });

    $.RULE('primaryExpression', () => {
      $.OR([
        { ALT: () => $.CONSUME(NUMBER) },
        { ALT: () => $.CONSUME(UPPERNAME) },
        { ALT: () => $.CONSUME(LOWERNAME) },
        { ALT: () => $.SUBRULE($.diceExpression) },
        { ALT: () => $.SUBRULE($.parenExpression) },
      ]);
    });

    $.RULE('diceExpression', () => {
      $.OPTION(() => {
        $.CONSUME(NUMBER);
      });
      $.CONSUME(D_OP);
      $.OR([
        { ALT: () => $.CONSUME(NUMBER) },
        { ALT: () => $.CONSUME(UPPERNAME) },
        { ALT: () => $.SUBRULE($.parenExpression) },
      ]);
    });

    $.RULE('parenExpression', () => {
      $.CONSUME(LPAREN);
      $.SUBRULE($.expression);
      $.CONSUME(RPAREN);
    });

    $.RULE('rollExpression', () => {
      $.CONSUME(D_OP);
      $.SUBRULE($.primaryExpression);
    });

    $.RULE('sequenceExpression', () => {
      $.CONSUME(LBRACE);
      $.OPTION(() => {
        $.COMMA_SEP($.expression);
      });
      $.CONSUME(RBRACE);
    });

    $.RULE('indexExpression', () => {
      $.SUBRULE($.expression);
      $.CONSUME(AT);
      $.SUBRULE($.expression);
    });

    this.performSelfAnalysis();
  }
}
