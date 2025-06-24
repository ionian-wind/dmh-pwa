// Shared utilities for the dice roller system

import type { ASTNode, EvaluationContext } from './types';

// AST traversal utilities
export function traverseAST(node: ASTNode, visitor: (node: ASTNode) => void): void {
  visitor(node);
  
  // Recursively visit children
  for (const key of Object.keys(node)) {
    if (key === 'type') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(child => {
        if (child && typeof child === 'object' && 'type' in child) {
          traverseAST(child, visitor);
        }
      });
    } else if (value && typeof value === 'object' && 'type' in value) {
      traverseAST(value, visitor);
    }
  }
}

export function findNodesByType(ast: ASTNode, type: string): ASTNode[] {
  const nodes: ASTNode[] = [];
  traverseAST(ast, (node) => {
    if (node.type === type) {
      nodes.push(node);
    }
  });
  return nodes;
}

// Math function implementations
export const mathFunctions = {
  floor: (x: number): number => Math.floor(x),
  ceil: (x: number): number => Math.ceil(x),
  round: (x: number): number => Math.round(x),
  abs: (x: number): number => Math.abs(x),
  min: (...args: number[]): number => Math.min(...args),
  max: (...args: number[]): number => Math.max(...args),
};

// Validation utilities
export function validateInteger(value: any, name: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`${name} must be a valid integer`);
  }
  return num;
}

export function validatePositiveInteger(value: any, name: string): number {
  const num = validateInteger(value, name);
  if (num <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return num;
}

export function validateRange(value: number, min: number, max: number, name: string): number {
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return value;
}

// Dice rolling utilities
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

// Array utilities for dice modifiers
export function keepHighest(rolls: number[], count: number): number[] {
  return [...rolls].sort((a, b) => b - a).slice(0, count);
}

export function keepLowest(rolls: number[], count: number): number[] {
  return [...rolls].sort((a, b) => a - b).slice(0, count);
}

export function dropHighest(rolls: number[], count: number): number[] {
  return [...rolls].sort((a, b) => b - a).slice(count);
}

export function dropLowest(rolls: number[], count: number): number[] {
  return [...rolls].sort((a, b) => a - b).slice(count);
}

// Success counting utilities
export function countSuccesses(rolls: number[], target: number, operator: '>' | '<' | '>=' | '<=' | '=' | '!='): number {
  return rolls.filter(roll => {
    switch (operator) {
      case '>': return roll > target;
      case '<': return roll < target;
      case '>=': return roll >= target;
      case '<=': return roll <= target;
      case '=': return roll === target;
      case '!=': return roll !== target;
      default: return false;
    }
  }).length;
}

// Explosion utilities
export function explodeDice(
    rolls: number[], 
    sides: number, 
    maxRolls: number = 99, 
    explosionTarget?: number,
    operator?: '>' | '<' | '>=' | '<=' | '=' | '!='
): { rolls: number[], warnings: string[] } {
  const result: number[] = [...rolls];
  const warnings: string[] = [];
  let rollCount = rolls.length;
  
  const target = explosionTarget ?? sides;
  const op = operator ?? '=';

  for (let i = 0; i < result.length && rollCount < maxRolls; i++) {
    let currentRoll = result[i];
    
    let shouldExplode = false;
    do {
        switch (op) {
            case '>': shouldExplode = currentRoll > target; break;
            case '<': shouldExplode = currentRoll < target; break;
            case '>=': shouldExplode = currentRoll >= target; break;
            case '<=': shouldExplode = currentRoll <= target; break;
            case '=': shouldExplode = currentRoll === target; break;
            case '!=': shouldExplode = currentRoll !== target; break;
            default: shouldExplode = currentRoll === target;
        }

        if (shouldExplode && rollCount < maxRolls) {
            const newRoll = rollDie(sides);
            result.push(newRoll);
            currentRoll = newRoll;
            rollCount++;
        } else {
            shouldExplode = false;
        }
    } while (shouldExplode);
  }
  
  if (rollCount >= maxRolls) {
    warnings.push('Maximum roll count (99) reached during explosion');
  }
  
  return { rolls: result, warnings };
}

// Debug log utility
export function debugLog(module: string, ...args: any[]) {
  if (typeof window === 'undefined') {
    console.log(`[${module}]`, ...args);
  }
} 