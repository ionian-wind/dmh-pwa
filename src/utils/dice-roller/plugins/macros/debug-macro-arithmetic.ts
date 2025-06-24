// Debug file for macro + arithmetic evaluation
import { DiceRollerCore } from '../../core';
import { macrosPlugin } from './index';
import { dicePlugin } from '../dice/dicePlugin';

// Register plugins
console.log('[DEBUG] Registering dice plugin...');
DiceRollerCore.registerPlugin(dicePlugin);
console.log('[DEBUG] Registering macros plugin...');
DiceRollerCore.registerPlugin(macrosPlugin);

// Macro map with nested macro
defineDebug();

function defineDebug() {
  const macroMap = {
    a: { type: 'dice', count: 1, sides: 6, modifiers: [] },
    b: { type: 'macro', name: 'a' },
  };

  const expr = '1d20 + #b';
  console.log('[DEBUG] Parsing:', expr);
  const ast = DiceRollerCore.parseInput(expr);
  console.log('[DEBUG] AST:', JSON.stringify(ast, null, 2));

  const context: any = { macroMap };
  console.log('[DEBUG] Evaluating AST...');
  try {
    const result = DiceRollerCore.evaluate(ast, context);
    console.log('[DEBUG] Evaluation result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[DEBUG] Evaluation error:', err);
  }
}

// Minimal arithmetic test
function minimalArithmeticTest() {
  const expr = '1+2';
  console.log('[DEBUG] Minimal arithmetic test: Parsing:', expr);
  const ast = DiceRollerCore.parseInput(expr);
  console.log('[DEBUG] Minimal arithmetic AST:', JSON.stringify(ast, null, 2));
  console.log('[DEBUG] Evaluating minimal arithmetic AST...');
  try {
    const result = DiceRollerCore.evaluate(ast, {});
    console.log('[DEBUG] Minimal arithmetic evaluation result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[DEBUG] Minimal arithmetic evaluation error:', err);
  }
}

minimalArithmeticTest(); 