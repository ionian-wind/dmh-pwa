import { CstParser } from 'chevrotain';
import {
  decodeSyntaxErrorMetadata,
  parserErrorMessageProvider,
} from './syntaxErrorProvider';
import { DiceSyntaxError } from './errors';
import {
  allTokens,
  And,
  At,
  Colon,
  Comma,
  D,
  DoubleDot,
  ElseKeyword,
  Equal,
  FunctionKeyword,
  Greater,
  GreaterEqual,
  Hash,
  IfKeyword,
  LCurly,
  LBracket,
  Less,
  LessEqual,
  LoopKeyword,
  LParen,
  Minus,
  NamedKeyword,
  Not,
  NotEqual,
  NumberLiteral,
  Or,
  OutputKeyword,
  OverKeyword,
  Percent,
  Plus,
  Power,
  RCurly,
  RBracket,
  ResultKeyword,
  RParen,
  SetKeyword,
  Slash,
  Star,
  StringLiteral,
  ToKeyword,
  VarName,
  Word,
  tokenize,
  wordTokens,
} from './tokens';

export class DiceParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
      errorMessageProvider: parserErrorMessageProvider,
    });
    this.performSelfAnalysis();
  }

  public program = this.RULE('program', () => {
    this.MANY(() => this.SUBRULE(this.statement));
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.functionStatement) },
      { ALT: () => this.SUBRULE(this.loopStatement) },
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.resultStatement) },
      { ALT: () => this.SUBRULE(this.setStatement) },
      { ALT: () => this.SUBRULE(this.outputStatement) },
      { ALT: () => this.SUBRULE(this.assignmentStatement) },
    ]);
  });

  public functionStatement = this.RULE('functionStatement', () => {
    this.CONSUME(FunctionKeyword);
    this.CONSUME(Colon);
    this.SUBRULE(this.functionSignature);
    this.SUBRULE(this.block);
  });

  private functionSignature = this.RULE('functionSignature', () => {
    this.AT_LEAST_ONE(() => {
      this.OR([
        ...wordTokens.map((token) => ({
          ALT: () => this.CONSUME(token, { LABEL: 'word' }),
        })),
        { ALT: () => this.SUBRULE(this.functionParameter, { LABEL: 'param' }) },
      ]);
    });
  });

  private functionParameter = this.RULE('functionParameter', () => {
    this.CONSUME(VarName, { LABEL: 'name' });
    this.OPTION(() => {
      this.CONSUME(Colon);
      this.OR([
        { ALT: () => this.CONSUME(Word, { LABEL: 'type' }) },
        { ALT: () => this.CONSUME(D, { LABEL: 'type' }) },
      ]);
    });
  });

  private outputStatement = this.RULE('outputStatement', () => {
    this.CONSUME(OutputKeyword);
    this.SUBRULE(this.expression, { LABEL: 'value' });
    this.OPTION(() => {
      this.CONSUME(NamedKeyword);
      this.CONSUME(StringLiteral, { LABEL: 'outputName' });
    });
  });

  private setStatement = this.RULE('setStatement', () => {
    this.CONSUME(SetKeyword);
    this.CONSUME(StringLiteral, { LABEL: 'setting' });
    this.CONSUME(ToKeyword);
    this.OR([
      {
        ALT: () => this.CONSUME2(StringLiteral, { LABEL: 'stringValue' }),
      },
      {
        ALT: () => this.SUBRULE(this.expression, { LABEL: 'value' }),
      },
    ]);
  });

  private loopStatement = this.RULE('loopStatement', () => {
    this.CONSUME(LoopKeyword);
    this.CONSUME(VarName, { LABEL: 'variable' });
    this.CONSUME(OverKeyword);
    this.SUBRULE(this.expression, { LABEL: 'range' });
    this.SUBRULE(this.block, { LABEL: 'body' });
  });

  private ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(IfKeyword);
    this.SUBRULE(this.expression, { LABEL: 'condition' });
    this.SUBRULE(this.block, { LABEL: 'body' });
    this.OPTION(() => {
      this.CONSUME(ElseKeyword);
      this.OR([
        { ALT: () => this.SUBRULE(this.ifStatement, { LABEL: 'elseIf' }) },
        { ALT: () => this.SUBRULE2(this.block, { LABEL: 'elseBody' }) },
      ]);
    });
  });

  private resultStatement = this.RULE('resultStatement', () => {
    this.CONSUME(ResultKeyword);
    this.CONSUME(Colon);
    this.SUBRULE(this.expression, { LABEL: 'value' });
  });

  private assignmentStatement = this.RULE('assignmentStatement', () => {
    this.CONSUME(VarName, { LABEL: 'name' });
    this.CONSUME(Colon);
    this.SUBRULE(this.expression, { LABEL: 'value' });
  });

  private block = this.RULE('block', () => {
    this.CONSUME(LCurly);
    this.MANY(() => this.SUBRULE(this.statement));
    this.CONSUME(RCurly);
  });

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.logicalOr);
  });

  private logicalOr = this.RULE('logicalOr', () => {
    this.SUBRULE(this.logicalAnd, { LABEL: 'operand' });
    this.MANY(() => {
      this.CONSUME(Or, { LABEL: 'operator' });
      this.SUBRULE2(this.logicalAnd, { LABEL: 'operand' });
    });
  });

  private logicalAnd = this.RULE('logicalAnd', () => {
    this.SUBRULE(this.comparison, { LABEL: 'operand' });
    this.MANY(() => {
      this.CONSUME(And, { LABEL: 'operator' });
      this.SUBRULE2(this.comparison, { LABEL: 'operand' });
    });
  });

  private comparison = this.RULE('comparison', () => {
    this.SUBRULE(this.additive, { LABEL: 'operand' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Equal, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(NotEqual, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(Less, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(Greater, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(LessEqual, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(GreaterEqual, { LABEL: 'operator' }) },
      ]);
      this.SUBRULE2(this.additive, { LABEL: 'operand' });
    });
  });

  private additive = this.RULE('additive', () => {
    this.SUBRULE(this.multiplicative, { LABEL: 'operand' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(Minus, { LABEL: 'operator' }) },
      ]);
      this.SUBRULE2(this.multiplicative, { LABEL: 'operand' });
    });
  });

  private multiplicative = this.RULE('multiplicative', () => {
    this.SUBRULE(this.exponent, { LABEL: 'operand' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Star, { LABEL: 'operator' }) },
        { ALT: () => this.CONSUME(Slash, { LABEL: 'operator' }) },
      ]);
      this.SUBRULE2(this.exponent, { LABEL: 'operand' });
    });
  });

  private exponent = this.RULE('exponent', () => {
    this.SUBRULE(this.access, { LABEL: 'operand' });
    this.MANY(() => {
      this.CONSUME(Power, { LABEL: 'operator' });
      this.SUBRULE2(this.access, { LABEL: 'operand' });
    });
  });

  private access = this.RULE('access', () => {
    this.SUBRULE(this.dice, { LABEL: 'operand' });
    this.MANY(() => {
      this.CONSUME(At, { LABEL: 'operator' });
      this.SUBRULE2(this.dice, { LABEL: 'operand' });
    });
  });

  private dice = this.RULE('dice', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(D);
          this.SUBRULE(this.diceOperand, { LABEL: 'faces' });
        },
      },
      {
        ALT: () => {
          this.SUBRULE(this.unary, { LABEL: 'count' });
          this.OPTION(() => {
            this.CONSUME2(D);
            this.SUBRULE3(this.diceOperand, { LABEL: 'faces' });
          });
        },
      },
    ]);
  });

  private diceOperand = this.RULE('diceOperand', () => {
    this.OR([
      { ALT: () => this.CONSUME(Percent, { LABEL: 'percent' }) },
      { ALT: () => this.SUBRULE(this.unary, { LABEL: 'value' }) },
    ]);
  });

  private unary = this.RULE('unary', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Plus);
          this.SUBRULE(this.unary);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Minus);
          this.SUBRULE2(this.unary);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Not);
          this.SUBRULE3(this.unary);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Hash);
          this.SUBRULE4(this.unary);
        },
      },
      { ALT: () => this.SUBRULE5(this.term) },
    ]);
  });

  private term = this.RULE('term', () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral, { LABEL: 'number' }) },
      { ALT: () => this.CONSUME(VarName, { LABEL: 'variable' }) },
      { ALT: () => this.SUBRULE(this.callExpression, { LABEL: 'call' }) },
      { ALT: () => this.SUBRULE(this.sequenceLiteral, { LABEL: 'sequence' }) },
      { ALT: () => this.SUBRULE(this.parenthesized, { LABEL: 'group' }) },
    ]);
  });

  private callExpression = this.RULE('callExpression', () => {
    this.CONSUME(LBracket);
    this.AT_LEAST_ONE(() => {
      this.OR([
        ...wordTokens.map((token) => ({
          ALT: () => this.CONSUME(token, { LABEL: 'word' }),
        })),
        { ALT: () => this.SUBRULE(this.expression, { LABEL: 'argument' }) },
      ]);
    });
    this.CONSUME(RBracket);
  });

  private sequenceLiteral = this.RULE('sequenceLiteral', () => {
    this.CONSUME(LCurly);
    this.OPTION(() => {
      this.SUBRULE(this.sequenceElement, { LABEL: 'element' });
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.sequenceElement, { LABEL: 'element' });
      });
      this.OPTION2(() => this.CONSUME2(Comma));
    });
    this.CONSUME(RCurly);
  });

  private sequenceElement = this.RULE('sequenceElement', () => {
    this.SUBRULE(this.expression, { LABEL: 'value' });
    this.OPTION(() => {
      this.CONSUME(DoubleDot);
      this.SUBRULE2(this.expression, { LABEL: 'rangeEnd' });
    });
    this.OPTION2(() => {
      this.CONSUME(Colon);
      this.SUBRULE3(this.expression, { LABEL: 'repeat' });
    });
  });

  private parenthesized = this.RULE('parenthesized', () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.expression);
    this.CONSUME(RParen);
  });
}

function unexpectedCharacter(message: string, input: string, offset: number) {
  const match = message.match(/unexpected character:\s*->(.*?)<-/i);
  if (match?.[1]) return match[1];
  return input.charAt(offset) || undefined;
}

function lexerErrorToIssue(
  error: {
    message: string;
    offset: number;
    line: number;
    column: number;
    length: number;
    code?: string;
    found?: string;
  },
  input: string,
): DiceSyntaxError {
  const found =
    error.found ?? unexpectedCharacter(error.message, input, error.offset);
  return new DiceSyntaxError(
    error.message,
    error.line,
    error.column,
    error.line,
    error.column + Math.max(1, error.length),
    {
      code: (error.code as DiceSyntaxError['code']) ?? 'unexpected-character',
      found,
    },
  );
}

function parserErrorToIssue(error: any): DiceSyntaxError {
  const token = error.token;
  const previous = error.previousToken;
  const hasStart =
    token !== undefined &&
    (token.startLine ?? -1) > 0 &&
    (token.startColumn ?? -1) > 0;
  const hasEnd =
    token !== undefined &&
    (token.endLine ?? -1) > 0 &&
    (token.endColumn ?? -1) > 0;
  const line = hasStart
    ? (token!.startLine as number)
    : (previous?.endLine ?? 1);
  const column = hasStart
    ? (token!.startColumn as number)
    : (previous?.endColumn ?? 0) + 1;
  const endLine = hasEnd ? (token!.endLine as number) : line;
  const endColumn = hasEnd ? (token!.endColumn as number) + 1 : column + 1;
  const decoded = decodeSyntaxErrorMetadata(error.message);
  const metadata = decoded.metadata;
  const foundKind = metadata?.foundKind ?? token?.tokenType?.name;
  const found = metadata?.found ?? (token?.image?.trim() || undefined);
  const expected = metadata?.expected ?? [];
  const endOfInput = !token || foundKind === 'EOF';

  return new DiceSyntaxError(
    decoded.message,
    line,
    column,
    endLine,
    endColumn,
    {
      code:
        metadata?.code ??
        (endOfInput
          ? 'unexpected-end-of-input'
          : expected.length > 0
            ? 'unexpected-token'
            : 'invalid-syntax'),
      expected,
      found,
      foundKind,
    },
  );
}

function dedupeIssues(issues: DiceSyntaxError[]): DiceSyntaxError[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.line}:${issue.column}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function combinedSyntaxError(issues: DiceSyntaxError[]): DiceSyntaxError {
  const errors = dedupeIssues(issues);
  const first = errors[0];
  return new DiceSyntaxError(
    errors.map((error) => error.message).join('; '),
    first.line,
    first.column,
    first.endLine,
    first.endColumn,
    {
      code: first.code,
      found: first.found,
      foundKind: first.foundKind,
      expected: first.expected,
      errors,
    },
  );
}

export function parseCst(input: string) {
  const { tokens, errors } = tokenize(input);
  if (errors.length > 0) {
    throw combinedSyntaxError(
      errors.map((error) => lexerErrorToIssue(error, input)),
    );
  }
  const parser = new DiceParser();
  parser.input = tokens;
  const cst = parser.program();
  if (parser.errors.length > 0) {
    throw combinedSyntaxError(parser.errors.map(parserErrorToIssue));
  }
  return cst;
}
