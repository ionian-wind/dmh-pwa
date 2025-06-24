import { describe, it, expect } from 'vitest';
import { parseFormattingAst, extractFormatting, evaluateFormattingNode } from '../index';

// --- Parsing ---
describe('Formatting Plugin > Parsing', () => {
  it('should parse %NEWLINE% markup', () => {
    const result = parseFormattingAst('%NEWLINE%');
    expect(result).toEqual({ type: 'formatting', markup: 'NEWLINE' });
  });

  it('should parse lowercase %newline% markup', () => {
    const result = parseFormattingAst('%newline%');
    expect(result).toEqual({ type: 'formatting', markup: 'newline' });
  });

  it('should throw on invalid formatting markup', () => {
    expect(() => parseFormattingAst('NEWLINE')).toThrow('Invalid formatting markup syntax');
    expect(() => parseFormattingAst('%NEWLINE')).toThrow('Invalid formatting markup syntax');
    expect(() => parseFormattingAst('%%')).toThrow('Invalid formatting markup syntax');
  });
});

// --- Extraction ---
describe('Formatting Plugin > Extraction', () => {
  it('should extract formatting markups from AST', () => {
    const ast = { type: 'formatting', markup: 'NEWLINE' };
    const formatting = extractFormatting(ast);
    expect(formatting).toEqual(['NEWLINE']);
  });

  it('should extract multiple formatting markups from complex AST', () => {
    const ast = {
      type: 'group',
      expressions: [
        { type: 'formatting', markup: 'NEWLINE' },
        { type: 'formatting', markup: 'BOLD' }
      ]
    };
    const formatting = extractFormatting(ast);
    expect(formatting).toEqual(['NEWLINE', 'BOLD']);
  });

  it('should return empty array for AST without formatting', () => {
    const ast = { type: 'number', value: 5 };
    const formatting = extractFormatting(ast);
    expect(formatting).toEqual([]);
  });
});

// --- Evaluation ---
describe('Formatting Plugin > Evaluation', () => {
  it('should evaluate %NEWLINE% markup', () => {
    const node = { type: 'formatting', markup: 'NEWLINE' };
    const context = {} as any;
    const result = evaluateFormattingNode(node, context);
    expect(result.details.markup).toBe('NEWLINE');
    expect(result.details.value).toBe('\n');
  });

  it('should evaluate lowercase %newline% markup', () => {
    const node = { type: 'formatting', markup: 'newline' };
    const context = {} as any;
    const result = evaluateFormattingNode(node, context);
    expect(result.details.markup).toBe('newline');
    expect(result.details.value).toBe('\n');
  });

  it('should throw error for unknown formatting markup', () => {
    const node = { type: 'formatting', markup: 'BOLD' };
    const context = {} as any;
    expect(() => evaluateFormattingNode(node, context)).toThrow('Unknown formatting markup: %BOLD%');
  });

  it('should throw error for non-formatting node', () => {
    const node = { type: 'number', value: 5 };
    const context = {} as any;
    expect(() => evaluateFormattingNode(node, context)).toThrow('Expected formatting node');
  });
}); 