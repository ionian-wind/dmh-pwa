import { describe, it, expect } from 'vitest';
import { parseRollReferenceAst, extractRollReferences, evaluateRollReferenceNode } from '../index';

// --- Parsing ---
describe('Roll References Plugin > Parsing', () => {
  it('should parse an inline roll reference', () => {
    const result = parseRollReferenceAst('$[[0]]');
    expect(result).toEqual({ type: 'roll-reference', ref: '0' });
  });

  it('should parse a named roll reference', () => {
    const result = parseRollReferenceAst('$[roll:attackRoll]');
    expect(result).toEqual({ type: 'roll-reference', ref: 'attackRoll' });
  });

  it('should throw on invalid roll reference syntax', () => {
    expect(() => parseRollReferenceAst('$[0]')).toThrow('Invalid roll reference syntax');
    expect(() => parseRollReferenceAst('$[roll:]')).toThrow('Invalid roll reference syntax');
    expect(() => parseRollReferenceAst('$[[abc]]')).toThrow('Invalid roll reference syntax');
  });
});

// --- Extraction ---
describe('Roll References Plugin > Extraction', () => {
  it('should extract roll references from AST', () => {
    const ast = { type: 'roll-reference', ref: '0' };
    const refs = extractRollReferences(ast);
    expect(refs).toEqual(['0']);
  });

  it('should extract multiple roll references from complex AST', () => {
    const ast = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'roll-reference', ref: '0' },
      right: { type: 'roll-reference', ref: 'attackRoll' }
    };
    const refs = extractRollReferences(ast);
    expect(refs).toEqual(['0', 'attackRoll']);
  });

  it('should return empty array for AST without roll references', () => {
    const ast = { type: 'number', value: 5 };
    const refs = extractRollReferences(ast);
    expect(refs).toEqual([]);
  });
});

// --- Evaluation ---
describe('Roll References Plugin > Evaluation', () => {
  it('should evaluate an inline roll reference', () => {
    const node = { type: 'roll-reference', ref: '0' };
    const context = { rolls: { '0': 15 } } as any;
    const result = evaluateRollReferenceNode(node, context);
    expect(result.total).toBe(15);
    expect(result.details.ref).toBe('0');
    expect(result.details.value).toBe(15);
  });

  it('should evaluate a named roll reference', () => {
    const node = { type: 'roll-reference', ref: 'attackRoll' };
    const context = { rolls: { attackRoll: [7, 8] } } as any;
    const result = evaluateRollReferenceNode(node, context);
    expect(result.total).toBe(0); // Not a number, so total is 0
    expect(result.rolls).toEqual([7, 8]);
    expect(result.details.ref).toBe('attackRoll');
    expect(result.details.value).toEqual([7, 8]);
  });

  it('should throw error for missing reference', () => {
    const node = { type: 'roll-reference', ref: 'missing' };
    const context = { rolls: {} } as any;
    expect(() => evaluateRollReferenceNode(node, context)).toThrow("Referenced roll 'missing' not found");
  });

  it('should throw error for non-roll-reference node', () => {
    const node = { type: 'number', value: 5 };
    const context = {} as any;
    expect(() => evaluateRollReferenceNode(node, context)).toThrow('Expected roll reference node');
  });
}); 