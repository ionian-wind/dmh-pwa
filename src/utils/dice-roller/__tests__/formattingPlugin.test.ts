import { formattingPlugin } from '../plugins/formatting';
import { registerPlugin } from '../core';

describe('Formatting Plugin', () => {
  beforeAll(() => {
    registerPlugin(formattingPlugin);
  });

  it('should extract formatting nodes from AST', () => {
    const ast = { type: 'formatting', markup: '%NEWLINE%' };
    const formatting = formattingPlugin.extractFormatting?.(ast);
    expect(formatting).toEqual(['%NEWLINE%']);
  });

  it('should throw on evaluateFormatting (not implemented)', () => {
    expect(() => formattingPlugin.evaluateFormatting?.({ type: 'formatting', markup: '%NEWLINE%' }, {})).toThrow();
  });
}); 