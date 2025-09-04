// Debug file for macro + arithmetic evaluation
import { DiceRollerCore } from '../../core';
import { macrosPlugin } from './index';
import { dicePlugin } from '../dice/dicePlugin';
import { debug, debugError } from '../../debug';

// Register plugins
debug('[DEBUG] Registering dice plugin...');
DiceRollerCore.registerPlugin(dicePlugin);
debug('[DEBUG] Registering macros plugin...');
DiceRollerCore.registerPlugin(macrosPlugin);

// Macro map with nested macro
defineDebug();

function defineDebug() {
  const macroMap = {
    a: { type: 'dice', count: 1, sides: 6, modifiers: [] },
    b: { type: 'macro', name: 'a' },
  };

  const expr = '1d20 + #b';
  debug('[DEBUG] Parsing:', expr);
  const ast = DiceRollerCore.parseInput(expr);
  debug('[DEBUG] AST:', JSON.stringify(ast, null, 2));

  const context: any = { macroMap };
  debug('[DEBUG] Evaluating AST...');
  try {
    const result = DiceRollerCore.evaluate(ast, context);
    debug('[DEBUG] Evaluation result:', JSON.stringify(result, null, 2));
  } catch (err) {
    debugError('[DEBUG] Evaluation error:', err);
  }
}

// Minimal arithmetic test
function minimalArithmeticTest() {
  const expr = '1+2';
  debug('[DEBUG] Minimal arithmetic test: Parsing:', expr);
  const ast = DiceRollerCore.parseInput(expr);
  debug('[DEBUG] Minimal arithmetic AST:', JSON.stringify(ast, null, 2));
  debug('[DEBUG] Evaluating minimal arithmetic AST...');
  try {
    const result = DiceRollerCore.evaluate(ast, {});
    debug(
      '[DEBUG] Minimal arithmetic evaluation result:',
      JSON.stringify(result, null, 2),
    );
  } catch (err) {
    debugError('[DEBUG] Minimal arithmetic evaluation error:', err);
  }
}

minimalArithmeticTest();
