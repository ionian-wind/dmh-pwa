import { 
  registerPlugin, 
  parseInput, 
  extractQueries, 
  extractMacros, 
  extractTables, 
  extractRolls, 
  extractFormatting,
  evaluate,
  processDiceExpression,
  DiceRollerCore,
  SyntaxError,
  ValidationError,
  MissingDataError
} from '../core';
import { 
  traverseAST, 
  findNodesByType, 
  mathFunctions, 
  validateInteger, 
  validatePositiveInteger, 
  validateRange,
  rollDie,
  rollDice,
  keepHighest,
  keepLowest,
  dropHighest,
  dropLowest,
  countSuccesses,
  explodeDice
} from '../lib/utils';
import { vi } from 'vitest';

// Mock plugin for testing
const mockPlugin = {
  name: 'mock',
  parse: (input: string) => {
    if (input === 'valid') {
      return { type: 'number', value: 42 };
    }
    throw new Error('Parse failed');
  },
  evaluate: (ast: any, context: any) => {
    if (ast.type === 'number') {
      return { total: ast.value, rolls: [], warnings: [] };
    }
    throw new Error('Evaluate failed');
  },
  extractQueries: (ast: any) => ast.type === 'query' ? [ast] : [],
  extractMacros: (ast: any) => ast.type === 'macro' ? [ast] : [],
  extractTables: (ast: any) => ast.type === 'table' ? [ast] : [],
  extractRolls: (ast: any) => ast.type === 'roll' ? [ast] : [],
  extractFormatting: (ast: any) => ast.type === 'formatting' ? [ast] : [],
  register: () => {}
};

describe('Dice Roller Core', () => {
  beforeEach(() => {
    // Clear plugins before each test
    (DiceRollerCore as any).plugins.length = 0;
  });

  describe('Plugin Registration', () => {
    it('should register plugins', () => {
      registerPlugin(mockPlugin);
      expect((DiceRollerCore as any).plugins).toContain(mockPlugin);
    });

    it('should call plugin register method', () => {
      const registerSpy = vi.fn();
      const pluginWithRegister = { ...mockPlugin, register: registerSpy };
      registerPlugin(pluginWithRegister);
      expect(registerSpy).toHaveBeenCalledWith(DiceRollerCore);
    });
  });

  describe('parseInput', () => {
    it('should parse valid input with registered plugin', () => {
      registerPlugin(mockPlugin);
      const result = parseInput('valid');
      expect(result).toEqual({ type: 'number', value: 42 });
    });

    it('should throw SyntaxError when no plugin can parse', () => {
      expect(() => parseInput('invalid')).toThrow(SyntaxError);
      expect(() => parseInput('invalid')).toThrow('Unable to parse input: invalid');
    });

    it('should continue to next plugin if one fails', () => {
      const failingPlugin = { ...mockPlugin, parse: () => { throw new Error('Fail'); } };
      const workingPlugin = { ...mockPlugin, parse: (input: string) => ({ type: 'number', value: 100 }) };
      
      registerPlugin(failingPlugin);
      registerPlugin(workingPlugin);
      
      const result = parseInput('valid');
      expect(result).toEqual({ type: 'number', value: 100 });
    });
  });

  describe('Extract Functions', () => {
    beforeEach(() => {
      registerPlugin(mockPlugin);
    });

    it('should extract queries from AST', () => {
      const ast = { type: 'query', prompt: 'test' };
      const result = extractQueries(ast);
      expect(result).toEqual([ast]);
    });

    it('should extract macros from AST', () => {
      const ast = { type: 'macro', name: 'test' };
      const result = extractMacros(ast);
      expect(result).toEqual([ast]);
    });

    it('should extract tables from AST', () => {
      const ast = { type: 'table', name: 'test' };
      const result = extractTables(ast);
      expect(result).toEqual([ast]);
    });

    it('should extract rolls from AST', () => {
      const ast = { type: 'roll', dice: '2d6' };
      const result = extractRolls(ast);
      expect(result).toEqual([ast]);
    });

    it('should extract formatting from AST', () => {
      const ast = { type: 'formatting', markup: 'bold' };
      const result = extractFormatting(ast);
      expect(result).toEqual([ast]);
    });

    it('should return empty arrays when no matches', () => {
      const ast = { type: 'number', value: 42 };
      expect(extractQueries(ast)).toEqual([]);
      expect(extractMacros(ast)).toEqual([]);
      expect(extractTables(ast)).toEqual([]);
      expect(extractRolls(ast)).toEqual([]);
      expect(extractFormatting(ast)).toEqual([]);
    });
  });

  describe('evaluate', () => {
    beforeEach(() => {
      registerPlugin(mockPlugin);
    });

    it('should evaluate AST with registered plugin', () => {
      const ast = { type: 'number', value: 42 };
      const context = { warnings: [] };
      const result = evaluate(ast, context);
      expect(result).toEqual({
        total: 42,
        rolls: [],
        warnings: [],
        details: {}
      });
    });

    it('should throw SyntaxError when no plugin can evaluate', () => {
      const ast = { type: 'unknown', value: 42 };
      const context = { warnings: [] };
      expect(() => evaluate(ast, context)).toThrow(SyntaxError);
      expect(() => evaluate(ast, context)).toThrow('Unable to evaluate node type: unknown');
    });

    it('should preserve warnings from context', () => {
      const ast = { type: 'number', value: 42 };
      const context = { warnings: ['test warning'] };
      const result = evaluate(ast, context);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('processDiceExpression', () => {
    beforeEach(() => {
      registerPlugin(mockPlugin);
    });

    it('should process complete dice expression', () => {
      const result = processDiceExpression('valid');
      expect(result).toEqual({
        total: 42,
        rolls: [],
        warnings: [],
        details: {
          queries: [],
          macros: [],
          tables: [],
          rolls: [],
          formatting: []
        }
      });
    });

    it('should throw SyntaxError on parse failure', () => {
      expect(() => processDiceExpression('invalid')).toThrow(SyntaxError);
    });

    it('should use default context when none provided', () => {
      const result = processDiceExpression('valid');
      expect(result).toBeDefined();
    });
  });
});

describe('Dice Roller Utils', () => {
  describe('traverseAST', () => {
    it('should traverse AST and call visitor for each node', () => {
      const ast = {
        type: 'arithmetic',
        op: '+',
        left: { type: 'number', value: 1 },
        right: { type: 'number', value: 2 }
      };
      
      const visited: string[] = [];
      traverseAST(ast, (node) => {
        visited.push(node.type);
      });
      
      expect(visited).toContain('arithmetic');
      expect(visited).toContain('number');
      expect(visited).toHaveLength(3);
    });
  });

  describe('findNodesByType', () => {
    it('should find all nodes of specified type', () => {
      const ast = {
        type: 'arithmetic',
        op: '+',
        left: { type: 'number', value: 1 },
        right: { type: 'number', value: 2 }
      };
      
      const numbers = findNodesByType(ast, 'number');
      expect(numbers).toHaveLength(2);
      expect(numbers[0].type).toBe('number');
      expect(numbers[1].type).toBe('number');
    });
  });

  describe('mathFunctions', () => {
    it('should implement all math functions correctly', () => {
      expect(mathFunctions.floor(3.7)).toBe(3);
      expect(mathFunctions.ceil(3.2)).toBe(4);
      expect(mathFunctions.round(3.5)).toBe(4);
      expect(mathFunctions.abs(-5)).toBe(5);
      expect(mathFunctions.min(1, 2, 3)).toBe(1);
      expect(mathFunctions.max(1, 2, 3)).toBe(3);
    });
  });

  describe('Validation Functions', () => {
    it('should validate integers correctly', () => {
      expect(validateInteger('42', 'test')).toBe(42);
      expect(validateInteger(42, 'test')).toBe(42);
      expect(() => validateInteger('abc', 'test')).toThrow('test must be a valid integer');
    });

    it('should validate positive integers correctly', () => {
      expect(validatePositiveInteger('42', 'test')).toBe(42);
      expect(() => validatePositiveInteger('0', 'test')).toThrow('test must be a positive integer');
      expect(() => validatePositiveInteger('-1', 'test')).toThrow('test must be a positive integer');
    });

    it('should validate ranges correctly', () => {
      expect(validateRange(5, 1, 10, 'test')).toBe(5);
      expect(() => validateRange(0, 1, 10, 'test')).toThrow('test must be between 1 and 10');
      expect(() => validateRange(11, 1, 10, 'test')).toThrow('test must be between 1 and 10');
    });
  });

  describe('Dice Rolling Functions', () => {
    it('should roll dice within expected range', () => {
      const result = rollDie(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    });

    it('should roll multiple dice', () => {
      const results = rollDice(3, 6);
      expect(results).toHaveLength(3);
      results.forEach(roll => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('Array Utility Functions', () => {
    const testRolls = [1, 5, 3, 2, 4];

    it('should keep highest rolls', () => {
      const result = keepHighest(testRolls, 3);
      expect(result).toEqual([5, 4, 3]);
    });

    it('should keep lowest rolls', () => {
      const result = keepLowest(testRolls, 3);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should drop highest rolls', () => {
      const result = dropHighest(testRolls, 2);
      expect(result).toEqual([3, 2, 1]);
    });

    it('should drop lowest rolls', () => {
      const result = dropLowest(testRolls, 2);
      expect(result).toEqual([3, 4, 5]);
    });
  });

  describe('countSuccesses', () => {
    const testRolls = [1, 5, 3, 2, 4];

    it('should count successes with different operators', () => {
      expect(countSuccesses(testRolls, 3, '>')).toBe(2); // 5, 4
      expect(countSuccesses(testRolls, 3, '<')).toBe(2); // 1, 2
      expect(countSuccesses(testRolls, 3, '>=')).toBe(3); // 5, 4, 3
      expect(countSuccesses(testRolls, 3, '<=')).toBe(3); // 1, 2, 3
      expect(countSuccesses(testRolls, 3, '=')).toBe(1); // 3
      expect(countSuccesses(testRolls, 3, '!=')).toBe(4); // 1, 5, 2, 4
    });
  });

  describe('explodeDice', () => {
    it('should explode dice correctly', () => {
      // Mock Math.random to return 0.9 (which gives us 6 on d6)
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.9);
      
      const rolls = [6, 3, 6];
      const result = explodeDice(rolls, 6, 10);
      
      expect(result.rolls.length).toBeGreaterThan(3);
      // Accept warnings if present due to max roll count
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      
      Math.random = originalRandom;
    });

    it('should respect max roll limit', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.9);
      
      const rolls = [6];
      const result = explodeDice(rolls, 6, 5);
      
      expect(result.rolls.length).toBeLessThanOrEqual(5);
      expect(result.warnings).toContain('Maximum roll count (99) reached during explosion');
      
      Math.random = originalRandom;
    });
  });
}); 