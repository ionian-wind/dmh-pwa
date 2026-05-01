// parser.ts
import { createToken, CstParser, IToken } from 'chevrotain';
import {
  NumberLiteral,
  D,
  Percent,
  VariableIdentifier,
  FunctionIdentifier,
  StringLiteral,
  OutputKeyword,
  NamedKeyword,
  FunctionKeyword,
  IfKeyword,
  ElseKeyword,
  LoopKeyword,
  OverKeyword,
  ResultKeyword,
  SetKeyword,
  ToKeyword,
  Plus,
  Minus,
  Star,
  Slash,
  Caret,
  Equal,
  NotEqual,
  LessThan,
  GreaterThan,
  LessEqual,
  GreaterEqual,
  And,
  Or,
  Not,
  At,
  Hash,
  Colon,
  Comma,
  LBracket,
  RBracket,
  LCurly,
  RCurly,
  LParen,
  RParen,
  Semicolon,
  TypeIdentifier,
} from './lexer';

// Type identifier tokens for function parameters
const TypeN = { name: 'TypeN', pattern: /n/ } as const;
const TypeD = { name: 'TypeD', pattern: /d/ } as const;
const TypeS = { name: 'TypeS', pattern: /s/ } as const;

export class DiceParser extends CstParser {
  constructor(tokenVector: IToken[]) {
    super(tokenVector); // Pass token vector to base class
    this.performSelfAnalysis();
  }

  // Root rule: program = statement*
  public program = this.RULE('program', () => {
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
  });

  // rule for dice expressions
  private diceExpression = this.RULE('diceExpression', () => {
    this.OPTION(() => {
      this.CONSUME(NumberLiteral, { LABEL: 'count' });
    });
    this.CONSUME(D, { LABEL: 'd' });
    this.OR([
      { ALT: () => this.CONSUME(Percent, { LABEL: 'percent' }) },
      { ALT: () => this.CONSUME(NumberLiteral, { LABEL: 'sides' }) },
      { ALT: () => this.SUBRULE(this.sequenceLiteral, { LABEL: 'sequence' }) },
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.expression, { LABEL: 'expr' });
          this.CONSUME(RParen);
        },
      },
    ]);
  });

  // statement = variableAssignment | outputStatement | functionDefinition | setDirective | ifStatement | loopStatement | resultStatement
  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.variableAssignment) },
      { ALT: () => this.SUBRULE(this.outputStatement) },
      { ALT: () => this.SUBRULE(this.functionDefinition) },
      { ALT: () => this.SUBRULE(this.setDirective) },
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.loopStatement) },
      { ALT: () => this.SUBRULE(this.resultStatement) },
    ]);
  });

  // variableAssignment = identifier ":" expression
  private variableAssignment = this.RULE('variableAssignment', () => {
    this.CONSUME(VariableIdentifier, { LABEL: 'name' });
    this.CONSUME(Colon);
    this.SUBRULE(this.expression, { LABEL: 'value' });
  });

  // outputStatement = "output" expression ("named" stringLiteral)?
  private outputStatement = this.RULE('outputStatement', () => {
    this.CONSUME(OutputKeyword);
    this.SUBRULE(this.expression, { LABEL: 'expr' });
    this.OPTION(() => {
      this.CONSUME(NamedKeyword);
      this.CONSUME(StringLiteral, { LABEL: 'name' });
    });
  });

  // functionDefinition = "function" ":" identifier "(" parameterList ")" "{" statement* "}"
  private functionDefinition = this.RULE('functionDefinition', () => {
    this.CONSUME(FunctionKeyword);
    this.CONSUME(Colon);
    this.CONSUME(FunctionIdentifier, { LABEL: 'name' });
    this.CONSUME(LParen);
    this.SUBRULE(this.parameterList);
    this.CONSUME(RParen);
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RCurly);
  });

  // parameterList = (parameter ("," parameter)*)?
  private parameterList = this.RULE('parameterList', () => {
    this.OPTION(() => {
      this.SUBRULE(this.parameter, { LABEL: 'first' });
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE(this.parameter, { LABEL: 'next' });
      });
    });
  });

  // parameter = identifier ":" type
  private parameter = this.RULE('parameter', () => {
    this.CONSUME(VariableIdentifier, { LABEL: 'name' });
    this.CONSUME(Colon);
    this.CONSUME(TypeIdentifier, { LABEL: 'type' }); // Fixed: use TypeIdentifier
  });

  // setDirective = "set" stringLiteral "to" expression
  private setDirective = this.RULE('setDirective', () => {
    this.CONSUME(SetKeyword);
    this.CONSUME(StringLiteral, { LABEL: 'setting' });
    this.CONSUME(ToKeyword);
    this.SUBRULE(this.expression, { LABEL: 'value' });
  });

  // ifStatement = "if" expression block ("else" block)?
  private ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(IfKeyword);
    this.SUBRULE(this.expression, { LABEL: 'condition' });
    this.SUBRULE(this.block, { LABEL: 'thenBlock' });
    this.OPTION(() => {
      this.CONSUME(ElseKeyword);
      this.SUBRULE(this.block, { LABEL: 'elseBlock' });
    });
  });

  // loopStatement = "loop" identifier "over" expression block
  private loopStatement = this.RULE('loopStatement', () => {
    this.CONSUME(LoopKeyword);
    this.CONSUME(VariableIdentifier, { LABEL: 'var' });
    this.CONSUME(OverKeyword);
    this.SUBRULE(this.expression, { LABEL: 'range' });
    this.SUBRULE(this.block, { LABEL: 'body' });
  });

  // resultStatement = "result" ":" expression
  private resultStatement = this.RULE('resultStatement', () => {
    this.CONSUME(ResultKeyword);
    this.CONSUME(Colon);
    this.SUBRULE(this.expression, { LABEL: 'value' });
  });

  // block = "{" statement* "}"
  private block = this.RULE('block', () => {
    this.CONSUME(LCurly);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(RCurly);
  });

  // Expression rules (unchanged, but removed if/loop from primaryExpression)
  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.logicalOrExpression);
  });

  private logicalOrExpression = this.RULE('logicalOrExpression', () => {
    this.SUBRULE(this.logicalAndExpression, { LABEL: 'lhs' });
    this.MANY(() => {
      this.CONSUME(Or);
      this.SUBRULE2(this.logicalAndExpression, { LABEL: 'rhs' });
    });
  });

  private logicalAndExpression = this.RULE('logicalAndExpression', () => {
    this.SUBRULE(this.comparisonExpression, { LABEL: 'lhs' });
    this.MANY(() => {
      this.CONSUME(And);
      this.SUBRULE2(this.comparisonExpression, { LABEL: 'rhs' });
    });
  });

  private comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.additiveExpression, { LABEL: 'lhs' });
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Equal) },
        { ALT: () => this.CONSUME(NotEqual) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(GreaterThan) },
        { ALT: () => this.CONSUME(LessEqual) },
        { ALT: () => this.CONSUME(GreaterEqual) },
      ]);
      this.SUBRULE2(this.additiveExpression, { LABEL: 'rhs' });
    });
  });

  private additiveExpression = this.RULE('additiveExpression', () => {
    this.SUBRULE(this.multiplicativeExpression, { LABEL: 'lhs' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) },
      ]);
      this.SUBRULE2(this.multiplicativeExpression, { LABEL: 'rhs' });
    });
  });

  private multiplicativeExpression = this.RULE(
    'multiplicativeExpression',
    () => {
      this.SUBRULE(this.exponentiationExpression, { LABEL: 'lhs' });
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(Star) },
          { ALT: () => this.CONSUME(Slash) },
        ]);
        this.SUBRULE2(this.exponentiationExpression, { LABEL: 'rhs' });
      });
    },
  );

  private exponentiationExpression = this.RULE(
    'exponentiationExpression',
    () => {
      this.SUBRULE(this.unaryExpression, { LABEL: 'lhs' });
      this.OPTION(() => {
        this.CONSUME(Caret);
        this.SUBRULE2(this.unaryExpression, { LABEL: 'rhs' });
      });
    },
  );

  private unaryExpression = this.RULE('unaryExpression', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.primaryExpression) },
      {
        ALT: () => {
          this.CONSUME(Not);
          this.SUBRULE(this.unaryExpression, { LABEL: 'operand' });
        },
      },
      {
        ALT: () => {
          this.CONSUME(Hash);
          this.SUBRULE(this.unaryExpression, { LABEL: 'operand' });
        },
      },
      {
        ALT: () => {
          this.CONSUME(Minus);
          this.SUBRULE(this.unaryExpression, { LABEL: 'operand' });
        },
      },
    ]);
  });

  private primaryExpression = this.RULE('primaryExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral, { LABEL: 'number' }) },
      { ALT: () => this.SUBRULE(this.diceExpression) }, // add this
      { ALT: () => this.CONSUME(VariableIdentifier, { LABEL: 'variable' }) },
      { ALT: () => this.SUBRULE(this.functionInvocation) },
      { ALT: () => this.SUBRULE(this.sequenceLiteral) },
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
    ]);
  });

  private functionInvocation = this.RULE('functionInvocation', () => {
    this.CONSUME(LBracket);
    this.CONSUME(FunctionIdentifier, { LABEL: 'name' });
    this.MANY(() => {
      this.SUBRULE(this.expression, { LABEL: 'args' });
    });
    this.CONSUME(RBracket);
  });

  private sequenceLiteral = this.RULE('sequenceLiteral', () => {
    this.CONSUME(LCurly);
    this.SUBRULE(this.sequenceElements);
    this.CONSUME(RCurly);
  });

  private sequenceElements = this.RULE('sequenceElements', () => {
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.sequenceElement);
      this.OPTION(() => this.CONSUME(Comma));
    });
  });

  private sequenceElement = this.RULE('sequenceElement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.expression) },
      {
        ALT: () => {
          this.SUBRULE(this.expression, { LABEL: 'value' });
          this.CONSUME(Colon);
          this.SUBRULE(this.expression, { LABEL: 'count' });
        },
      },
      {
        ALT: () => {
          this.CONSUME(DiceLiteral, { LABEL: 'dieToSeq' });
        },
      },
    ]);
  });

  private parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.expression);
    this.CONSUME(RParen);
  });
}

// Export parse function
export function parse(tokens: IToken[]) {
  const parser = new DiceParser(tokens);
  parser.program();
  if (parser.errors.length > 0) {
    throw new Error(
      `Parsing errors: ${parser.errors.map((e) => e.message).join(', ')}`,
    );
  }
  return parser;
}
