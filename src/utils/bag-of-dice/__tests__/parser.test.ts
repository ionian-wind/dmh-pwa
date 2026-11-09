import { describe, expect, it } from 'vitest';
import { createToken } from 'chevrotain';
import type { DicePlugin } from '../engine/contracts';
import { buildTokenVocabulary, tokenize } from '../engine/lexer';
import { parseExpression } from '../engine/parser';

const arithmeticPlugin: DicePlugin = {
  name: 'arithmetic',
  tokens: [],
  evaluate: () => null,
};

const dummyPlugin: DicePlugin = {
  name: 'dummy',
  tokens: [
    createToken({
      name: 'DummyKeyword',
      pattern: /woof/,
      longer_alt: createToken({
        name: 'DummyIdentifier',
        pattern: /[A-Za-z]+/,
      }),
    }),
  ],
  evaluate: () => null,
};

describe('token vocabulary', () => {
  it('tokenizes math and dice without collisions', () => {
    const vocabulary = buildTokenVocabulary([arithmeticPlugin]);
    const result = tokenize('2d6 + 3', vocabulary);
    expect(result.errors).toEqual([]);
    expect(result.tokens.map((token) => token.tokenType.name)).toEqual([
      'NumberLiteral',
      'DiceSeparator',
      'NumberLiteral',
      'Plus',
      'NumberLiteral',
    ]);
  });

  it('keeps modifier keywords as identifiers', () => {
    const vocabulary = buildTokenVocabulary([]);
    const result = tokenize('2d6kh3', vocabulary);
    expect(result.errors).toEqual([]);
    expect(result.tokens.map((token) => token.image)).toEqual([
      '2',
      'd',
      '6',
      'kh',
      '3',
    ]);
  });

  it('rejects token-name collisions with different patterns', () => {
    const first: DicePlugin = {
      name: 'first',
      tokens: [createToken({ name: 'Shared', pattern: /a/ })],
      evaluate: () => null,
    };
    const second: DicePlugin = {
      name: 'second',
      tokens: [createToken({ name: 'Shared', pattern: /b/ })],
      evaluate: () => null,
    };
    expect(() => buildTokenVocabulary([first, second])).toThrow(
      /token name collision/,
    );
  });

  it('allows identical duplicate token declarations', () => {
    const pattern = /zzz/;
    const first: DicePlugin = {
      name: 'first',
      tokens: [createToken({ name: 'Shared', pattern })],
      evaluate: () => null,
    };
    const second: DicePlugin = {
      name: 'second',
      tokens: [createToken({ name: 'Shared', pattern: /zzz/ })],
      evaluate: () => null,
    };
    expect(() => buildTokenVocabulary([first, second])).not.toThrow();
  });

  it('builds each plugin grammar independently', () => {
    expect(() => buildTokenVocabulary([arithmeticPlugin])).not.toThrow();
    expect(() => buildTokenVocabulary([dummyPlugin])).not.toThrow();
    const vocabulary = buildTokenVocabulary([dummyPlugin]);
    expect(vocabulary.tokenMap.DummyKeyword).toBeDefined();
  });
});

describe('lexer errors', () => {
  it('reports unknown characters with an offset', () => {
    const result = parseExpression('1 + `');
    expect(result.errors[0]).toMatchObject({
      code: 'PARSE_UNKNOWN_TOKEN',
      pass: 'parse',
    });
    expect(result.errors[0].span?.start).toBe(4);
  });
});

describe('core parser', () => {
  it('parses arithmetic precedence into a typed AST', () => {
    const result = parseExpression('5+7*2');
    expect(result.errors).toEqual([]);
    expect(result.ast).toMatchObject({
      type: 'BinaryOp',
      op: '+',
      left: { type: 'NumberLiteral', value: 5 },
      right: {
        type: 'BinaryOp',
        op: '*',
        left: { type: 'NumberLiteral', value: 7 },
        right: { type: 'NumberLiteral', value: 2 },
      },
    });
  });

  it('parses dice modifiers and labels', () => {
    const result = parseExpression('2d6!>5kh1[fire]');
    expect(result.errors).toEqual([]);
    expect(result.ast).toMatchObject({
      type: 'Dice',
      count: { type: 'NumberLiteral', value: 2 },
      sides: { type: 'NumberLiteral', value: 6 },
      label: 'fire',
      modifiers: [
        { type: 'Modifier', name: '!', compare: { op: '>', value: 5 } },
        { type: 'Modifier', name: 'kh', argument: 1 },
      ],
    });
  });

  it('parses custom and computed dice', () => {
    const custom = parseExpression('d[1,2,3]');
    expect(custom.errors).toEqual([]);
    expect(custom.ast).toMatchObject({
      type: 'Dice',
      customFaces: [1, 2, 3],
    });

    const computed = parseExpression('(1+1)d(2+4)');
    expect(computed.errors).toEqual([]);
    expect(computed.ast).toMatchObject({
      type: 'Dice',
      count: {
        type: 'BinaryOp',
        op: '+',
      },
      sides: {
        type: 'BinaryOp',
        op: '+',
      },
    });
  });

  it('parses grouped rolls', () => {
    const result = parseExpression('{2d6, 1d8}>8');
    expect(result.errors).toEqual([]);
    expect(result.ast).toMatchObject({
      type: 'GroupedRoll',
      rolls: [{ type: 'Dice' }, { type: 'Dice' }],
      modifiers: [{ type: 'Modifier', name: 'compare' }],
    });
  });

  it('reports malformed input with a span', () => {
    const result = parseExpression('2d6 +');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toMatch(/^PARSE_/);
    expect(result.errors[0].span?.start).toBeGreaterThanOrEqual(0);
  });

  it('bounds parser recovery errors', () => {
    const result = parseExpression('1 + + + + + + + + + + + +', {
      maxRecovery: 1,
    });
    expect(result.errors.length).toBeLessThanOrEqual(2);
    expect(result.errors.at(-1)?.code).toBe('PARSE_RECOVERY_LIMIT');
  });
});

describe('AST contract', () => {
  const samples = [
    '1',
    '-1',
    '1+2*3',
    'floor(2.5)',
    '1d6',
    '1d6!',
    '{1d6,2d8}',
  ];

  it('gives every node a type, plugin and span', () => {
    for (const sample of samples) {
      const result = parseExpression(sample);
      expect(result.errors, sample).toEqual([]);
      const visit = (node: unknown) => {
        expect(node).toMatchObject({
          type: expect.any(String),
          plugin: expect.any(String),
          span: {
            start: expect.any(Number),
            end: expect.any(Number),
          },
        });
        const record = node as Record<string, unknown>;
        for (const key of ['left', 'right', 'operand', 'count', 'sides']) {
          const child = record[key];
          if (child && typeof child === 'object') visit(child);
        }
        if (Array.isArray(record.args)) record.args.forEach(visit);
        if (Array.isArray(record.rolls)) record.rolls.forEach(visit);
        if (Array.isArray(record.modifiers)) record.modifiers.forEach(visit);
      };
      visit(result.ast);
    }
  });
});
