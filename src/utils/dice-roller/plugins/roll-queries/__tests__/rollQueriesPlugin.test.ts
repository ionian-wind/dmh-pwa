import { describe, it, expect } from 'vitest';
import { parseRollQueryAst, extractRollQueries, evaluateRollQueryNode } from '../index';

// --- Parsing ---
describe('Roll Queries Plugin > Parsing', () => {
  it('should parse a simple roll query with default', () => {
    const result = parseRollQueryAst('?{Bonus|0}');
    expect(result).toEqual({ 
      type: 'roll-query', 
      prompt: 'Bonus', 
      default: '0' 
    });
  });

  it('should parse a roll query with options', () => {
    const result = parseRollQueryAst('?{Weapon|Sword,Axe}');
    expect(result).toEqual({ 
      type: 'roll-query', 
      prompt: 'Weapon', 
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    });
  });

  it('should parse a roll query with labeled options', () => {
    const result = parseRollQueryAst('?{Action|Attack,1d20+5|Damage,1d8+3}');
    expect(result).toEqual({ 
      type: 'roll-query', 
      prompt: 'Action', 
      options: [
        { label: 'Attack', value: '1d20+5' },
        { label: 'Damage', value: '1d8+3' }
      ]
    });
  });

  it('should parse a roll query with only prompt', () => {
    const result = parseRollQueryAst('?{Name}');
    expect(result).toEqual({ 
      type: 'roll-query', 
      prompt: 'Name' 
    });
  });

  it('should throw on invalid roll query syntax', () => {
    expect(() => parseRollQueryAst('{Bonus|0}')).toThrow('Invalid roll query syntax');
    expect(() => parseRollQueryAst('?Bonus|0}')).toThrow('Invalid roll query syntax');
    expect(() => parseRollQueryAst('?{Bonus|0')).toThrow('Invalid roll query syntax');
  });

  it('should throw on empty roll query', () => {
    expect(() => parseRollQueryAst('?{}')).toThrow('Roll query must have at least a prompt');
  });
});

// --- Extraction ---
describe('Roll Queries Plugin > Extraction', () => {
  it('should extract roll queries from AST', () => {
    const ast = { type: 'roll-query', prompt: 'Bonus', default: '0' };
    const queries = extractRollQueries(ast);
    expect(queries).toEqual([{ prompt: 'Bonus', default: '0' }]);
  });

  it('should extract multiple roll queries from complex AST', () => {
    const ast = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'roll-query', prompt: 'Bonus', default: '0' },
      right: { type: 'roll-query', prompt: 'Modifier', default: '1' }
    };
    const queries = extractRollQueries(ast);
    expect(queries).toEqual([
      { prompt: 'Bonus', default: '0' },
      { prompt: 'Modifier', default: '1' }
    ]);
  });

  it('should extract roll queries with options', () => {
    const ast = { 
      type: 'roll-query', 
      prompt: 'Weapon', 
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    };
    const queries = extractRollQueries(ast);
    expect(queries).toEqual([{ 
      prompt: 'Weapon', 
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    }]);
  });

  it('should return empty array for AST without roll queries', () => {
    const ast = { type: 'number', value: 5 };
    const queries = extractRollQueries(ast);
    expect(queries).toEqual([]);
  });
});

// --- Evaluation ---
describe('Roll Queries Plugin > Evaluation', () => {
  it('should evaluate a roll query with numeric user input', () => {
    const node = { type: 'roll-query', prompt: 'Bonus', default: '0' };
    const context = { userInput: { 'Bonus': 5 } } as any;
    
    const result = evaluateRollQueryNode(node, context);
    expect(result.total).toBe(5);
    expect(result.details.query).toBe('Bonus');
    expect(result.details.userValue).toBe(5);
  });

  it('should evaluate a roll query with string user input', () => {
    const node = { type: 'roll-query', prompt: 'Bonus', default: '0' };
    const context = { userInput: { 'Bonus': '3' } } as any;
    
    const result = evaluateRollQueryNode(node, context);
    expect(result.total).toBe(3);
    expect(result.details.userValue).toBe('3');
  });

  it('should evaluate a roll query with option selection', () => {
    const node = { 
      type: 'roll-query', 
      prompt: 'Weapon', 
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    };
    const context = { userInput: { 'Weapon': 'Sword' } } as any;
    
    const result = evaluateRollQueryNode(node, context);
    expect(result.total).toBe(0); // String value defaults to 0
    expect(result.details.userValue).toBe('Sword');
  });

  it('should throw error for missing user input', () => {
    const node = { type: 'roll-query', prompt: 'Bonus' };
    const context = { userInput: {} } as any;
    expect(() => evaluateRollQueryNode(node, context)).toThrow('User input not provided for query: Bonus');
  });

  it('should throw error for invalid option', () => {
    const node = { 
      type: 'roll-query', 
      prompt: 'Weapon', 
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    };
    const context = { userInput: { 'Weapon': 'Bow' } } as any;
    
    expect(() => evaluateRollQueryNode(node, context)).toThrow('Invalid option \'Bow\' for query \'Weapon\'. Valid options: Sword, Axe');
  });

  it('should throw error for non-roll-query node', () => {
    const node = { type: 'number', value: 5 };
    const context = {} as any;
    
    expect(() => evaluateRollQueryNode(node, context)).toThrow('Expected roll query node');
  });

  it('should handle non-numeric string input', () => {
    const node = { type: 'roll-query', prompt: 'Name' };
    const context = { userInput: { 'Name': 'John' } } as any;
    
    const result = evaluateRollQueryNode(node, context);
    expect(result.total).toBe(0); // Non-numeric string defaults to 0
    expect(result.details.userValue).toBe('John');
  });

  it('should use default value if user input is missing', () => {
    const node = { type: 'roll-query', prompt: 'Bonus', default: '7' };
    const context = { userInput: {} } as any;
    const result = evaluateRollQueryNode(node, context);
    expect(result.total).toBe(7);
    expect(result.details.userValue).toBe('7');
  });

  it('should throw error if nesting limit is exceeded', () => {
    const node = { type: 'roll-query', prompt: 'Bonus', default: '0' };
    const context = { userInput: { 'Bonus': 5 }, nestingLevel: 99, maxNesting: 99 } as any;
    expect(() => evaluateRollQueryNode(node, context)).toThrow('Roll query recursion limit exceeded (99 levels)');
  });

  it('should use default option if user input is missing and default is a valid option', () => {
    const node = {
      type: 'roll-query',
      prompt: 'Weapon',
      default: 'Sword',
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    };
    const context = { userInput: {} } as any;
    const result = evaluateRollQueryNode(node, context);
    expect(result.details.userValue).toBe('Sword');
    expect(result.total).toBe(0); // String value defaults to 0
  });

  it('should throw error if default is not a valid option', () => {
    const node = {
      type: 'roll-query',
      prompt: 'Weapon',
      default: 'Bow',
      options: [
        { label: 'Sword', value: 'Sword' },
        { label: 'Axe', value: 'Axe' }
      ]
    };
    const context = { userInput: {} } as any;
    expect(() => evaluateRollQueryNode(node, context)).toThrow("Invalid option 'Bow' for query 'Weapon'. Valid options: Sword, Axe");
  });
}); 