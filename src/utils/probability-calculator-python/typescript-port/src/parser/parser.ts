import {
  createToken,
  Lexer,
  CstParser,
  TokenVocabulary,
  CstNode,
  IToken,
} from 'chevrotain';

import { roll } from '../roller';
import { RV } from '../randvar';
import { Seq } from '../seq';
import {
  highest_X_of_X,
  lowest_X_of_X,
  sort_X,
  reverse_X,
  absolute_X,
} from '../funclib';

export type EvalResult = unknown;

const NEWLINE = createToken({
  name: 'NEWLINE',
  pattern: /\n/,
  group: Lexer.SKIPPED,
});
const COMMENT = createToken({
  name: 'COMMENT',
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});
const OUTPUT = createToken({ name: 'OUTPUT', pattern: /output/ });
const FUNCTION = createToken({ name: 'FUNCTION', pattern: /function/ });
const LOOP = createToken({ name: 'LOOP', pattern: /loop/ });
const OVER = createToken({ name: 'OVER', pattern: /over/ });
const IF = createToken({ name: 'IF', pattern: /if/ });
const ELSE = createToken({ name: 'ELSE', pattern: /else/ });
const RESULT = createToken({ name: 'RESULT', pattern: /result/ });
const PLUS = createToken({ name: 'PLUS', pattern: /\+/ });
const MINUS = createToken({ name: 'MINUS', pattern: /-/ });
const TIMES = createToken({ name: 'TIMES', pattern: /\*/ });
const DIVIDE = createToken({ name: 'DIVIDE', pattern: /\// });
const POWER = createToken({ name: 'POWER', pattern: /\^/ });
const COLON = createToken({ name: 'COLON', pattern: /:/ });
const LESS = createToken({ name: 'LESS', pattern: /</ });
const LESS_EQ = createToken({ name: 'LESS_EQ', pattern: /<=/ });
const GREATER = createToken({ name: 'GREATER', pattern: />/ });
const GREATER_EQ = createToken({ name: 'GREATER_EQ', pattern: />=/ });
const EQUALS = createToken({ name: 'EQUALS', pattern: /=/ });
const NOTEQUALS = createToken({ name: 'NOTEQUALS', pattern: /!=/ });
const AT = createToken({ name: 'AT', pattern: /@/ });
const HASH = createToken({ name: 'HASH', pattern: /#/ });
const OR = createToken({ name: 'OR', pattern: /\|/ });
const AND = createToken({ name: 'AND', pattern: /&/ });
const DOT = createToken({ name: 'DOT', pattern: /\./ });
const DOUBLE_DOT = createToken({ name: 'DOUBLE_DOT', pattern: /\.\./ });
const COMMA = createToken({ name: 'COMMA', pattern: /,/ });
const LPAREN = createToken({ name: 'LPAREN', pattern: /\(/ });
const RPAREN = createToken({ name: 'RPAREN', pattern: /\)/ });
const LBRACE = createToken({ name: 'LBRACE', pattern: /\{/ });
const RBRACE = createToken({ name: 'RBRACE', pattern: /}/ });
const LBRACKET = createToken({ name: 'LBRACKET', pattern: /\[/ });
const RBRACKET = createToken({ name: 'RBRACKET', pattern: /]/ });
const LOWERNAME = createToken({
  name: 'LOWERNAME',
  pattern: /[a-z][a-zA-Z_]*/,
});
const UPPERNAME = createToken({
  name: 'UPPERNAME',
  pattern: /[A-Z_][A-Za-z_]*/,
});
const NUMBER = createToken({ name: 'NUMBER', pattern: /\d+(\.\d+)?/ });
const D_OP = createToken({ name: 'D_OP', pattern: /d/ });

export const allTokens: TokenVocabulary = [
  NEWLINE,
  COMMENT,
  OUTPUT,
  FUNCTION,
  LOOP,
  OVER,
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
  LESS_EQ,
  GREATER,
  GREATER_EQ,
  EQUALS,
  NOTEQUALS,
  AT,
  HASH,
  OR,
  AND,
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
];

export const CLexer = new Lexer(allTokens);

export class Parser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  protected program = this.RULE('program', () => {
    this.MANY(() => {
      this.SUBRULE(this.stmt);
    });
  });

  protected stmt = this.RULE('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.outputStmt) },
      { ALT: () => this.SUBRULE1(this.assignStmt) },
      { ALT: () => this.SUBRULE2(this.funcStmt) },
      { ALT: () => this.SUBRULE3(this.loopStmt) },
      { ALT: () => this.SUBRULE4(this.ifStmt) },
      { ALT: () => this.SUBRULE5(this.exprStmt) },
    ]);
  });

  protected outputStmt = this.RULE('outputStmt', () => {
    this.CONSUME(OUTPUT);
    this.SUBRULE(this.expr);
  });

  protected assignStmt = this.RULE('assignStmt', () => {
    this.CONSUME(UPPERNAME);
    this.CONSUME(COLON);
    this.SUBRULE1(this.expr);
  });

  protected funcStmt = this.RULE('funcStmt', () => {
    this.CONSUME(FUNCTION);
    this.CONSUME(LOWERNAME);
    this.CONSUME(LPAREN);
    this.CONSUME(RPAREN);
    this.CONSUME(LBRACE);
    this.MANY(() => {
      this.SUBRULE(this.stmt);
    });
    this.CONSUME(RBRACE);
  });

  protected loopStmt = this.RULE('loopStmt', () => {
    this.CONSUME(LOOP);
    this.CONSUME(LOWERNAME);
    this.CONSUME(OVER);
    this.SUBRULE(this.expr);
    this.CONSUME1(LBRACE);
    this.MANY(() => {
      this.SUBRULE1(this.stmt);
    });
    this.CONSUME1(RBRACE);
  });

  protected ifStmt = this.RULE('ifStmt', () => {
    this.CONSUME(IF);
    this.SUBRULE(this.expr);
    this.CONSUME(LBRACE);
    this.MANY(() => {
      this.SUBRULE(this.stmt);
    });
    this.CONSUME(RBRACE);
    this.OPTION(() => {
      this.CONSUME(ELSE);
      this.CONSUME2(LBRACE);
      this.MANY1(() => {
        this.SUBRULE1(this.stmt);
      });
      this.CONSUME2(RBRACE);
    });
  });

  protected exprStmt = this.RULE('exprStmt', () => {
    this.SUBRULE(this.expr);
  });

  protected expr = this.RULE('expr', () => {
    this.SUBRULE(this.orExpr);
  });

  protected orExpr = this.RULE('orExpr', () => {
    this.SUBRULE1(this.andExpr);
    this.MANY(() => {
      this.CONSUME(OR);
      this.SUBRULE2(this.andExpr);
    });
  });

  protected andExpr = this.RULE('andExpr', () => {
    this.SUBRULE1(this.concatExpr);
    this.MANY(() => {
      this.CONSUME(AND);
      this.SUBRULE2(this.concatExpr);
    });
  });

  protected concatExpr = this.RULE('concatExpr', () => {
    this.SUBRULE1(this.rangeExpr);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(HASH) },
        { ALT: () => this.CONSUME(DOT) },
      ]);
      this.SUBRULE2(this.rangeExpr);
    });
  });

  protected rangeExpr = this.RULE('rangeExpr', () => {
    this.SUBRULE1(this.addExpr);
    this.MANY(() => {
      this.CONSUME(DOUBLE_DOT);
      this.SUBRULE2(this.addExpr);
    });
  });

  protected addExpr = this.RULE('addExpr', () => {
    this.SUBRULE1(this.mulExpr);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(PLUS) },
        { ALT: () => this.CONSUME(MINUS) },
      ]);
      this.SUBRULE2(this.mulExpr);
    });
  });

  protected mulExpr = this.RULE('mulExpr', () => {
    this.SUBRULE1(this.powExpr);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(TIMES) },
        { ALT: () => this.CONSUME(DIVIDE) },
      ]);
      this.SUBRULE2(this.powExpr);
    });
  });

  protected powExpr = this.RULE('powExpr', () => {
    this.SUBRULE1(this.atExpr);
    this.MANY(() => {
      this.CONSUME(POWER);
      this.SUBRULE2(this.atExpr);
    });
  });

  protected atExpr = this.RULE('atExpr', () => {
    this.SUBRULE1(this.compExpr);
    this.MANY(() => {
      this.CONSUME(AT);
      this.SUBRULE2(this.compExpr);
    });
  });

  protected compExpr = this.RULE('compExpr', () => {
    this.SUBRULE1(this.primary);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(EQUALS) },
        { ALT: () => this.CONSUME(NOTEQUALS) },
        { ALT: () => this.CONSUME(LESS) },
        { ALT: () => this.CONSUME(LESS_EQ) },
        { ALT: () => this.CONSUME(GREATER) },
        { ALT: () => this.CONSUME(GREATER_EQ) },
      ]);
      this.SUBRULE2(this.primary);
    });
  });

  protected primary = this.RULE('primary', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.diceNotation) },
      { ALT: () => this.SUBRULE1(this.number) },
      { ALT: () => this.SUBRULE(this.funcCall) },
      { ALT: () => this.SUBRULE(this.variable) },
      { ALT: () => this.SUBRULE(this.sequence) },
      { ALT: () => this.SUBRULE(this.parenExpr) },
      { ALT: () => this.SUBRULE(this.resultExpr) },
    ]);
  });

  protected diceNotation = this.RULE('diceNotation', () => {
    this.CONSUME1(NUMBER);
    this.CONSUME(D_OP);
    this.CONSUME2(NUMBER);
  });

  protected number = this.RULE('number', () => {
    this.CONSUME(NUMBER);
  });

  protected variable = this.RULE('variable', () => {
    this.CONSUME(UPPERNAME);
  });

  protected sequence = this.RULE('sequence', () => {
    this.CONSUME(LBRACE);
    this.MANY_SEP({
      SEP: COMMA,
      DEF: () => {
        this.SUBRULE(this.expr);
      },
    });
    this.CONSUME(RBRACE);
  });

  protected parenExpr = this.RULE('parenExpr', () => {
    this.CONSUME(LPAREN);
    this.SUBRULE(this.expr);
    this.CONSUME(RPAREN);
  });

  protected funcCall = this.RULE('funcCall', () => {
    this.CONSUME(LOWERNAME);
    this.CONSUME(LPAREN);
    this.MANY_SEP({
      SEP: COMMA,
      DEF: () => {
        this.SUBRULE(this.expr);
      },
    });
    this.CONSUME(RPAREN);
  });

  protected resultExpr = this.RULE('resultExpr', () => {
    this.CONSUME(RESULT);
    this.SUBRULE(this.expr);
  });
}

export const parserInstance = new Parser();

export function parse(input: string): CstNode {
  const lexResult = CLexer.tokenize(input);
  if (lexResult.errors.length > 0) {
    throw new Error(lexResult.errors.map((e) => e.message).join('\n'));
  }
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.program();
  if (parserInstance.errors.length > 0) {
    throw new Error(parserInstance.errors.map((e) => e.message).join('\n'));
  }
  return cst;
}

interface EvalContext {
  variables: Map<string, EvalResult>;
  functions: Map<string, { params: string[]; body: CstNode }>;
  outputs: EvalResult[];
}

function evalCst(cst: CstNode, ctx: EvalContext): EvalResult {
  if (!cst || !cst.children) {
    return undefined;
  }

  if (cst.name === 'program') {
    const stmts = cst.children.stmt || [];
    for (const stmt of stmts) {
      evalCst(stmt, ctx);
    }
    return ctx.outputs;
  }

  if (cst.name === 'outputStmt') {
    const expr = cst.children.expr?.[0];
    if (expr) {
      const val = evalCst(expr, ctx);
      ctx.outputs.push(val);
      return val;
    }
    return undefined;
  }

  if (cst.name === 'assignStmt') {
    const nameTok = cst.children.UPPERNAME?.[0];
    const expr = cst.children.expr?.[0];
    if (nameTok && expr) {
      const name = nameTok.image;
      const val = evalCst(expr, ctx);
      ctx.variables.set(name, val);
      return val;
    }
    return undefined;
  }

  if (cst.name === 'exprStmt') {
    const expr = cst.children.expr?.[0];
    if (expr) {
      return evalCst(expr, ctx);
    }
    return undefined;
  }

  if (cst.name === 'addExpr') {
    const terms = cst.children.expr || [];
    const ops = cst.children.PLUS?.map((t: IToken) => t.image).concat(
      cst.children.MINUS?.map((t: IToken) => t.image) || [],
    );
    if (terms.length === 0) return undefined;
    let result = evalCst(terms[0], ctx);
    for (let i = 1; i < terms.length; i++) {
      const rhs = evalCst(terms[i], ctx);
      const op = ops[i - 1];
      if (typeof result === 'number' && typeof rhs === 'number') {
        result = op === '+' ? result + rhs : result - rhs;
      } else {
        result = (result as any).__sub__(rhs);
        if (op === '+') {
          result = (result as any).__add__(rhs);
        }
      }
    }
    return result;
  }

  if (cst.name === 'mulExpr') {
    const terms = cst.children.expr || [];
    const ops = cst.children.TIMES?.map((t: IToken) => t.image).concat(
      cst.children.DIVIDE?.map((t: IToken) => t.image) || [],
    );
    if (terms.length === 0) return undefined;
    let result = evalCst(terms[0], ctx);
    for (let i = 1; i < terms.length; i++) {
      const rhs = evalCst(terms[i], ctx);
      const op = ops[i - 1];
      if (typeof result === 'number' && typeof rhs === 'number') {
        result = op === '*' ? result * rhs : result / rhs;
      } else {
        result = (result as any).__truediv__(rhs);
        if (op === '*') {
          result = (result as any).__mul__(rhs);
        }
      }
    }
    return result;
  }

  if (cst.name === 'primary') {
    const children = cst.children;
    if (children.diceNotation?.[0])
      return evalCst(children.diceNotation[0], ctx);
    if (children.number?.[0]) return evalCst(children.number[0], ctx);
    if (children.variable?.[0]) return evalCst(children.variable[0], ctx);
    if (children.sequence?.[0]) return evalCst(children.sequence[0], ctx);
    if (children.parenExpr?.[0]) return evalCst(children.parenExpr[0], ctx);
    if (children.funcCall?.[0]) return evalCst(children.funcCall[0], ctx);
    if (children.resultExpr?.[0]) return evalCst(children.resultExpr[0], ctx);
    return undefined;
  }

  if (cst.name === 'diceNotation') {
    const numTok = cst.children.NUMBER?.[0];
    const dOp = cst.children.D_OP?.[0];
    const dieTok = cst.children.NUMBER?.[1];
    if (numTok && dieTok) {
      const num = parseInt(numTok.image, 10);
      const die = parseInt(dieTok.image, 10);
      return roll(num, die);
    }
    return undefined;
  }

  if (cst.name === 'number') {
    const tok = cst.children.NUMBER?.[0];
    if (tok) {
      return parseFloat(tok.image);
    }
    return undefined;
  }

  if (cst.name === 'variable') {
    const tok = cst.children.UPPERNAME?.[0] || cst.children.LOWERNAME?.[0];
    if (tok) {
      const name = tok.image;
      if (ctx.variables.has(name)) {
        return ctx.variables.get(name);
      }
      if (ctx.functions.has(name)) {
        return name;
      }
      return name;
    }
    return undefined;
  }

  if (cst.name === 'sequence') {
    const exprs = cst.children.expr || [];

    const values = exprs.map((e: CstNode) => evalCst(e, ctx));
    return new Seq(values);
  }

  if (cst.name === 'parenExpr') {
    const expr = cst.children.expr?.[0];
    if (expr) {
      return evalCst(expr, ctx);
    }
    return undefined;
  }

  if (cst.name === 'funcCall') {
    const nameTok = cst.children.LOWERNAME?.[0];
    const args = cst.children.expr || [];
    if (nameTok) {
      const name = nameTok.image;

      const funcMap: Record<string, Function> = {
        highest: (...args: EvalResult[]) =>
          highest_X_of_X(args[0] as number, args[1] as any),
        lowest: (...args: EvalResult[]) =>
          lowest_X_of_X(args[0] as number, args[1] as any),
        sort: (...args: EvalResult[]) => sort_X(args[0] as any),
        reverse: (...args: EvalResult[]) => reverse_X(args[0] as any),
        absolute: (...args: EvalResult[]) => absolute_X(args[0] as any),
      };
      const argVals = args.map((a: CstNode) => evalCst(a, ctx));
      if (funcMap[name]) {
        return funcMap[name](...argVals);
      }
      const builtin: Record<string, Function> = {
        roll,
        Seq,
        RV,
      };
      if (builtin[name]) {
        return builtin[name](...argVals);
      }
    }
    return undefined;
  }

  if (cst.name === 'resultExpr') {
    const expr = cst.children.expr?.[0];
    if (expr) {
      return evalCst(expr, ctx);
    }
    return undefined;
  }

  if (cst.name === 'sequenceRange') {
    return undefined;
  }

  if (cst.name === 'rangeExpr') {
    return undefined;
  }

  if (
    cst.name === 'powExpr' ||
    cst.name === 'atExpr' ||
    cst.name === 'compExpr'
  ) {
    const expr = cst.children.expr?.[0];
    if (expr) {
      return evalCst(expr, ctx);
    }
    return undefined;
  }

  return undefined;
}

export function parseAndExec(input: string): EvalResult {
  const cst = parse(input);
  const ctx: EvalContext = {
    variables: new Map(),
    functions: new Map(),
    outputs: [],
  };
  return evalCst(cst, ctx);
}
