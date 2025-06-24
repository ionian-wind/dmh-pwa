import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import { evaluate } from '../../core';
import type { DiceAstNode, DiceEvaluationResult, DiceEvaluationContext } from './types';
import { parseDiceExpression } from './parser';
import { cstToAst } from './ast';
import { 
  rollDice, 
  keepHighest, 
  keepLowest, 
  dropHighest, 
  dropLowest, 
  countSuccesses, 
  explodeDice,
  mathFunctions,
  validatePositiveInteger
} from '../../lib/utils';
import { inlineRollsPlugin } from '../inline-rolls';
import { rollReferencesPlugin } from '../roll-references';

// DEBUG LOGGING
function debugLog(...args: any[]) {
  if (typeof window === 'undefined') {
    console.log('[dicePlugin]', ...args);
  }
}

// Parse dice expressions
export function parseDiceAst(input: string): DiceAstNode {
  debugLog('parseDiceAst: input:', input);
  try {
    const { cst, lexResult } = parseDiceExpression(input);
    let tokensArr: any[] = [];
    if (Array.isArray(lexResult.tokens) && lexResult.tokens.length > 0 && typeof lexResult.tokens[0] === 'object' && 'image' in lexResult.tokens[0] && 'tokenType' in lexResult.tokens[0]) {
      tokensArr = lexResult.tokens;
    }
    const debugTokens = tokensArr.map(t => ({ image: t.image, type: t.tokenType.name }));
    debugLog('parseDiceAst: lexResult.tokens:', debugTokens);
    debugLog('parseDiceAst: CST:', JSON.stringify(cst, null, 2));
    const ast = cstToAst(cst, tokensArr) as DiceAstNode;
    debugLog('parseDiceAst: AST:', JSON.stringify(ast, null, 2));
    return ast;
  } catch (err) {
    debugLog('parseDiceAst: ERROR:', err);
    throw err;
  }
}

// Apply dice modifiers
function applyModifiers(rolls: number[], modifiers: any[], sides: number, context: DiceEvaluationContext): DiceEvaluationResult {
  let result = [...rolls];
  const warnings: string[] = [];
  const details: any = { modifiers: [] };
  // Work on a local copy of modifiers
  let localModifiers = [...modifiers];
  // Remove the 'e' modifier from the list before the main loop
  const eIndex = localModifiers.findIndex(m => m.type === 'e');
  let eModifier = null;
  if (eIndex !== -1) {
    eModifier = localModifiers[eIndex];
    localModifiers = localModifiers.slice(0, eIndex).concat(localModifiers.slice(eIndex + 1));
  }
  // Track if we should skip collapsing to a count for success/eq/gt/lt/cs/cf if 'e' is present
  let skipCollapseForExhaustive = false;
  if (eModifier) {
    const lastIdx = localModifiers.findIndex(m => ['success','eq','gt','lt','cs','cf','s','f'].includes(m.type));
    if (lastIdx !== -1) {
      skipCollapseForExhaustive = true;
    }
  }
  let lastSuccessModifier = null;
  for (let i = 0; i < localModifiers.length; i++) {
    const modifier = localModifiers[i];
    details.modifiers.push(modifier.type);
    
    switch (modifier.type) {
      case 'kh': // Keep highest
        result = keepHighest(result, validatePositiveInteger(modifier.value, 'keep highest count'));
        break;
        
      case 'kl': // Keep lowest
        result = keepLowest(result, validatePositiveInteger(modifier.value, 'keep lowest count'));
        break;
        
      case 'dh': // Drop highest
        result = dropHighest(result, validatePositiveInteger(modifier.value, 'drop highest count'));
        // Only keep the remaining dice after dropping
        break;
        
      case 'dl': // Drop lowest
        result = dropLowest(result, validatePositiveInteger(modifier.value, 'drop lowest count'));
        // Only keep the remaining dice after dropping
        break;
        
      case 'k>': // Keep dice above threshold
        const keepAboveThreshold = validatePositiveInteger(modifier.value, 'keep above threshold');
        result = result.filter(roll => roll > keepAboveThreshold);
        break;
        
      case 'k<': // Keep dice below threshold
        const keepBelowThreshold = validatePositiveInteger(modifier.value, 'keep below threshold');
        result = result.filter(roll => roll < keepBelowThreshold);
        break;
        
      case 'r': // Reroll
        const rerollTarget = validatePositiveInteger(modifier.value, 'reroll target');
        const operator = modifier.operator || '=';
        result = result.map(roll => {
          let currentRoll = roll;
          let attempts = 0;
          const maxAttempts = 10; // Prevent infinite loops
          while (attempts < maxAttempts) {
            const shouldReroll = (() => {
              switch (operator) {
                case '>': return currentRoll > rerollTarget;
                case '<': return currentRoll < rerollTarget;
                case '>=': return currentRoll >= rerollTarget;
                case '<=': return currentRoll <= rerollTarget;
                case '=': return currentRoll === rerollTarget;
                case '!=': return currentRoll !== rerollTarget;
                default: return false;
              }
            })();
            if (!shouldReroll) break;
            currentRoll = Math.floor(Math.random() * sides) + 1;
            attempts++;
          }
          if (attempts >= maxAttempts) {
            warnings.push(`Reroll limit reached for target ${rerollTarget}`);
          }
          return currentRoll;
        });
        break;
        
      case 'ro': // Reroll once
        const roTarget = validatePositiveInteger(modifier.value, 'reroll once target');
        const roOperator = modifier.operator || '=';
        result = result.map(roll => {
          const shouldReroll = (() => {
            switch (roOperator) {
              case '>': return roll > roTarget;
              case '<': return roll < roTarget;
              case '>=': return roll >= roTarget;
              case '<=': return roll <= roTarget;
              case '=': return roll === roTarget;
              case '!=': return roll !== roTarget;
              default: return false;
            }
          })();
          if (shouldReroll) {
            return Math.floor(Math.random() * sides) + 1;
          }
          return roll;
        });
        break;
        
      case 'ra': // Reroll until success
        const raTarget = validatePositiveInteger(modifier.value, 'reroll until success target');
        if (!context.allowInfinite) {
          warnings.push('Infinite reroll disabled for safety');
          break;
        }
        result = result.map(roll => {
          let currentRoll = roll;
          while (currentRoll === raTarget) {
            currentRoll = Math.floor(Math.random() * sides) + 1;
          }
          return currentRoll;
        });
        break;
        
      case 'explode': // Explosion
        let maxExplosions = context.maxRolls || 99;
        let explosionOperator: '>' | '<' | '>=' | '<=' | '=' | '!=' = '>=';
        let explosionTarget: number | undefined = undefined;

        if (modifier.value === 'recursive') {
          // WORKAROUND for caching issue in vitest where the AST is not correctly formed
          const nextModifier = localModifiers[i + 1];
          if (nextModifier && (nextModifier.type === 'lt' || nextModifier.type === 'gt' || nextModifier.type === 'eq')) {
            explosionOperator = nextModifier.type === 'lt' ? '<' : nextModifier.type === 'gt' ? '>' : '=';
            explosionTarget = parseInt(nextModifier.value, 10);
            localModifiers.splice(i + 1, 1); // Consume the modifier
          } else if (modifier.target) {
            explosionOperator = modifier.operator || '>=';
            explosionTarget = modifier.target;
          } else {
            explosionTarget = sides;
          }

          if (typeof modifier.limit === 'number') {
            maxExplosions = modifier.limit;
          }
        } else {
            explosionTarget = modifier.target || sides;
            explosionOperator = modifier.operator || '=';
        }

        const explosionResult = explodeDice(
            result, 
            sides, 
            maxExplosions,
            explosionTarget,
            explosionOperator as any,
        );
        result = explosionResult.rolls;
        warnings.push(...explosionResult.warnings);
        details.explosions = result.length - rolls.length;
        break;
        
      case 'success':
      case 'f':
      case 's':
      case 'eq':
      case 'gt':
      case 'lt':
      case 'cs':
      case 'cf':
        lastSuccessModifier = modifier;
        const op = modifier.operator ||
          (modifier.type === 'eq' ? '=' :
           modifier.type === 'gt' ? '>' :
           modifier.type === 'lt' ? '<' :
           modifier.type === 'cs' ? '>=' :
           modifier.type === 'cf' ? '<=' : '=');
        const target = typeof modifier.target !== 'undefined' ? modifier.target : (typeof modifier.value !== 'undefined' ? parseInt(modifier.value, 10) : undefined);
        const count = countSuccesses(result, target, op);
        if (modifier.type === 's') {
          details.successes = count;
          if (!skipCollapseForExhaustive) result = [count];
        } else if (modifier.type === 'f') {
          details.failures = result.length - count;
          if (!skipCollapseForExhaustive) result = [result.length - count];
        } else if (modifier.type === 'cs') {
          details.criticals = count;
          if (!skipCollapseForExhaustive) result = [count];
        } else if (modifier.type === 'cf') {
          details.criticals = count;
          if (!skipCollapseForExhaustive) result = [count];
        } else {
          details.successes = count;
          if (!skipCollapseForExhaustive) result = [count];
        }
        break;
        
      case 'sa': // Sort ascending
        result.sort((a, b) => a - b);
        break;
        
      case 'sd': // Sort descending
        result.sort((a, b) => b - a);
        break;
        
      case 'mi': // Minimum
        const minValue = validatePositiveInteger(modifier.value, 'minimum value');
        result = result.map(roll => Math.max(roll, minValue));
        break;
        
      case 'ma': // Maximum
        const maxValue = validatePositiveInteger(modifier.value, 'maximum value');
        result = result.map(roll => Math.min(roll, maxValue));
        break;
        
      case 'm': // Matching
        // Find most common value
        const counts = new Map<number, number>();
        result.forEach(roll => {
          counts.set(roll, (counts.get(roll) || 0) + 1);
        });
        const maxCount = Math.max(...counts.values());
        const matches = Array.from(counts.entries()).filter(([_, count]) => count === maxCount);
        details.matches = matches;
        break;
        
      case 'o': // Roll once
        // This modifier is handled at the grouped roll level
        // It ensures the entire group is rolled only once
        details.rollOnce = true;
        break;
    }
  }
  
  // Now apply the 'e' modifier if present
  if (eModifier) {
    if (!lastSuccessModifier) {
      warnings.push('Exhaustive (e) operator requires a preceding success/eq/gt/lt/cs/cf modifier');
      details.exhaustive = { cycles: 0, totalSuccesses: 0 };
      result = [0];
    } else {
      const exOperator = lastSuccessModifier.operator ||
        (lastSuccessModifier.type === 'eq' ? '=' :
         lastSuccessModifier.type === 'gt' ? '>' :
         lastSuccessModifier.type === 'lt' ? '<' :
         lastSuccessModifier.type === 'cs' ? '>=' :
         lastSuccessModifier.type === 'cf' ? '<=' : '=');
      const exTarget = typeof lastSuccessModifier.target !== 'undefined' ? lastSuccessModifier.target : (typeof lastSuccessModifier.value !== 'undefined' ? parseInt(lastSuccessModifier.value, 10) : undefined);
      if (typeof exTarget === 'undefined') {
        warnings.push('Exhaustive operator missing target');
        details.exhaustive = { cycles: 0, totalSuccesses: 0 };
        result = [0];
      } else {
        let totalSuccesses = 0;
        let cycle = 0;
        let currentRolls = [...rolls];
        const maxCycles = 99;
        while (cycle < maxCycles) {
          const successes = currentRolls.filter(roll => {
            switch (exOperator) {
              case '>': return roll > exTarget;
              case '<': return roll < exTarget;
              case '>=': return roll >= exTarget;
              case '<=': return roll <= exTarget;
              case '=': return roll === exTarget;
              case '!=': return roll !== exTarget;
              default: return false;
            }
          });
          totalSuccesses += successes.length;
          if (typeof window === 'undefined') {
            console.log(`[Exhaustive] Cycle ${cycle + 1}:`, { currentRolls, successes, totalSuccesses });
          }
          if (successes.length === 0) break;
          currentRolls = successes.map(() => Math.floor(Math.random() * sides) + 1);
          cycle++;
        }
        if (cycle >= maxCycles) {
          warnings.push('Exhaustive reroll limit reached (99 cycles)');
        }
        details.exhaustive = { cycles: cycle, totalSuccesses };
        result = [totalSuccesses];
      }
    }
  }
  
  return {
    rolls: result,
    total: result.reduce((sum, roll) => sum + roll, 0),
    warnings,
    details
  };
}

// Evaluate dice nodes
export function evaluateDiceNode(node: DiceAstNode, context: DiceEvaluationContext): DiceEvaluationResult {
  debugLog('evaluateDiceNode called with:', JSON.stringify(node), JSON.stringify(context));
  if (node.type === 'number') {
    debugLog('number node:', node.value);
    return {
      rolls: [],
      total: node.value,
      warnings: [],
    };
  }
  
  if (node.type === 'unary') {
    debugLog('unary node:', node.op, node.operand);
    const operand = evaluateDiceNode(node.operand, context);
    let total = 0;
    
    switch (node.op) {
      case '-': total = -operand.total; break;
      default: total = operand.total;
    }
    
    debugLog('unary result:', total);
    return {
      rolls: operand.rolls || [],
      total,
      warnings: operand.warnings || [],
    };
  }
  
  if (node.type === 'arithmetic') {
    debugLog('Evaluating arithmetic:', node, context);
    const left = evaluateDiceNode(node.left as DiceAstNode, context);
    const right = evaluateDiceNode(node.right as DiceAstNode, context);
    
    let total = 0;
    switch (node.op) {
      case '+': total = left.total + right.total; break;
      case '-': total = left.total - right.total; break;
      case '*': total = left.total * right.total; break;
      case '/':
        if (right.total === 0) {
          debugLog('division by zero');
          throw new Error('Division by zero');
        }
        total = left.total / right.total;
        break;
      case '%':
        if (right.total === 0) {
          debugLog('modulo by zero');
          throw new Error('Modulo by zero');
        }
        total = left.total % right.total;
        break;
      case '**':
        total = left.total ** right.total;
        break;
      default: total = 0;
    }
    
    const rolls = [...(left.rolls || []), ...(right.rolls || [])];
    const warnings = [...(left.warnings || []), ...(right.warnings || [])];
    const details = {
      op: node.op,
      left: left.details,
      right: right.details,
    };
    
    return { total, rolls, warnings, details };
  }
  
  if (node.type === 'function') {
    debugLog('Evaluating function:', node, context);
    const args = node.args.map(arg => evaluate(arg as DiceAstNode, context).total);
    const func = mathFunctions[node.name];
    
    if (!func) {
      throw new Error(`Unknown function: ${node.name}`);
    }

    const total = func.apply(null, args);
    const rolls: number[] = []; // Functions don't produce dice rolls themselves
    const warnings: string[] = [];
    const details = {
      function: node.name,
      args: args,
    };
    
    return { total, rolls, warnings, details };
  }
  
  if (node.type === 'macro') {
    debugLog('macro node:', node.name);
    // Delegate macro node evaluation to the core, so the macros plugin can handle it
    if (typeof window === 'undefined') {
      console.log('[dicePlugin] evaluateDiceNode: delegating macro node to core.evaluate', JSON.stringify(node));
    }
    // Import core evaluate here to avoid circular dependency at module scope
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return evaluate(node, context);
  }
  
  if (node.type === 'table') {
    debugLog('table node:', node.name);
    // Table nodes should be handled by the tables plugin during expansion
    // This is a fallback that throws an error
    throw new Error(`Table '${node.name}' not found or not expanded`);
  }
  
  if (node.type === 'group') {
    debugLog('group node:', node.expressions);
    const results = node.expressions.map(expr => evaluateDiceNode(expr, context));
    return {
      rolls: results.flatMap(r => r.rolls || []),
      total: results.reduce((sum, r) => sum + r.total, 0),
      warnings: results.flatMap(r => r.warnings || []),
    };
  }
  
  if (node.type === 'custom-dice') {
    debugLog('custom-dice node:', node.count, node.sides);
    // Validate custom dice parameters
    if (node.count <= 0) {
      debugLog('custom-dice: count <= 0');
      throw new Error('Dice count must be positive');
    }
    if (node.sides.length === 0) {
      throw new Error('Custom dice must have at least one side');
    }
    
    // Roll the custom dice
    const initialRolls = rollCustomDice(node.count, node.sides);
    
    // Apply modifiers
    const result = applyModifiers(initialRolls, node.modifiers, Math.max(...node.sides), context);
    
    return {
      rolls: result.rolls,
      total: result.total,
      warnings: result.warnings,
      details: {
        ...result.details,
        label: node.label,
        count: node.count,
        sides: node.sides,
        modifiers: node.modifiers.map(m => m.type)
      } as any
    };
  }
  
  if (node.type === 'grouped-roll') {
    // Check for 'o' (roll once) modifier
    const hasRollOnce = node.modifiers.some(m => m.type === 'o');
    let results;
    if (hasRollOnce) {
      // Roll the group only once
      results = node.expressions.map(expr => evaluateDiceNode(expr, context));
    } else {
      // Default: roll each expression as usual
      results = node.expressions.map(expr => evaluateDiceNode(expr, context));
    }
    // Combine all rolls
    const allRolls = results.flatMap(r => r.rolls || []);
    const allWarnings = results.flatMap(r => r.warnings || []);
    // Apply group modifiers to the combined rolls
    const result = applyModifiers(allRolls, node.modifiers, Math.max(...allRolls, 1), context);
    return {
      rolls: result.rolls,
      total: result.total,
      warnings: [...allWarnings, ...(result.warnings??[])],
      details: {
        ...result.details,
        groupSize: node.expressions.length,
        modifiers: node.modifiers.map(m => m.type),
        rollOnce: hasRollOnce,
      } as any
    };
  }
  
  if (node.type === 'dice') {
    // Validate dice parameters
    if (node.count <= 0) {
      throw new Error('Dice count must be positive');
    }
    if (node.sides <= 0) {
      throw new Error('Dice sides must be positive');
    }
    
    // Roll the dice
    const initialRolls = rollDice(node.count, node.sides);
    
    // Apply modifiers
    const result = applyModifiers(initialRolls, node.modifiers, node.sides, context);
    
    return {
      rolls: result.rolls,
      total: result.total,
      warnings: result.warnings,
      details: {
        ...result.details,
        label: node.label,
        count: node.count,
        sides: node.sides,
        modifiers: node.modifiers.map(m => m.type)
      } as any
    };
  }
  
  if (node.type === 'fudge-dice') {
    // Validate Fudge dice parameters
    if (node.count <= 0) {
      throw new Error('Dice count must be positive');
    }
    
    // Roll the Fudge dice based on variant
    const rolls = rollFudgeDice(node.count, node.variant);
    
    // Apply modifiers
    const result = applyModifiers(rolls, node.modifiers, 1, context);
    
    return {
      rolls: result.rolls,
      total: result.total,
      warnings: result.warnings,
      details: {
        ...result.details,
        label: node.label,
        count: node.count,
        variant: node.variant,
        modifiers: node.modifiers.map(m => m.type)
      } as any
    };
  }
  
  if (node.type === 'crit-mod') {
    debugLog('Evaluating crit-mod:', node, context);
    return {
      total: 0, // Placeholder
      rolls: [],
      warnings: ['Crit-mod node should be handled by parent'],
      details: { critMod: node.mod }
    };
    
  } else if (node.type === 'function') {
    debugLog('Evaluating function:', node, context);
    const args = node.args.map(arg => evaluate(arg as DiceAstNode, context).total);
    const func = mathFunctions[node.name];
    
    if (!func) {
      throw new Error(`Unknown function: ${node.name}`);
    }

    const total = func.apply(null, args);
    const rolls: number[] = []; // Functions don't produce dice rolls themselves
    const warnings: string[] = [];
    const details = {
      function: node.name,
      args: args,
    };
    
    return { total, rolls, warnings, details };
  }
  
  debugLog('Unhandled node type in evaluateDiceNode:', node.type);
  return { total: 0, rolls: [], warnings: [`Unhandled node type: ${node.type}`], details: {} };
}

// Plugin definition
export const dicePlugin: DiceRollerPlugin = {
  // ... existing code ...
};