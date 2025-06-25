import { CstToAstHandlerMap } from '../../utils/cstAstConverter';

export type DiceAST =
  | { type: 'Dice'; count: number | null; sides: number | null; fudge: null | number; custom: number[] | null; plugin: 'dice'; modifiers?: ModifierAST[] }
  | { type: 'Group'; items: DiceAST[]; plugin: 'dice'; modifiers?: ModifierAST[] };

export type ModifierAST = { type: string; value: string };

export const diceCstToAstHandlers: CstToAstHandlerMap = {
  diceWithModifiers: (cst, helpers) => {
    const base = helpers(cst.children.diceExpression[0], diceCstToAstHandlers);
    const modifiers = ((cst.children.modifier || []) as any[]).map((m: any) => helpers(m, diceCstToAstHandlers));
    if (base.type === 'Group' || base.type === 'Dice') {
      base.modifiers = modifiers;
    }
    return base;
  },
  modifier: (cst) => {
    const token = (Object.values(cst.children)[0] as any[])[0];
    const type = token.tokenType.name;
    const value = token.image;
    return { type, value };
  },
  diceExpression: (cst, helpers) => {
    if (cst.children.groupedDice) {
      return helpers(cst.children.groupedDice[0], diceCstToAstHandlers);
    }
    if (cst.children.ndxDice) {
      return helpers(cst.children.ndxDice[0], diceCstToAstHandlers);
    }
    if (cst.children.dxDice) {
      return helpers(cst.children.dxDice[0], diceCstToAstHandlers);
    }
    if (cst.children.dPercentDice) {
      return helpers(cst.children.dPercentDice[0], diceCstToAstHandlers);
    }
    if (cst.children.dFudgeDice) {
      return helpers(cst.children.dFudgeDice[0], diceCstToAstHandlers);
    }
    if (cst.children.customDiceExpr) {
      return helpers(cst.children.customDiceExpr[0], diceCstToAstHandlers);
    }
    if (cst.children.computedDice) {
      return helpers(cst.children.computedDice[0], diceCstToAstHandlers);
    }
    throw new Error('Unknown diceExpression CST');
  },
  groupedDice: (cst, helpers) => {
    const items = cst.children.diceExpression.map((d: any) => helpers(d, diceCstToAstHandlers));
    // Attach modifiers if present (for cases like {2d6,1d8,2d6}o)
    let modifiers = [];
    if (cst.parent && cst.parent.children && cst.parent.children.modifier) {
      modifiers = (cst.parent.children.modifier as any[]).map((m: any) => helpers(m, diceCstToAstHandlers));
    }
    const group: any = { type: 'Group', items, plugin: 'dice' };
    if (modifiers.length) group.modifiers = modifiers;
    return group;
  },
  ndxDice: (cst) => {
    return {
      type: 'Dice',
      count: parseInt(cst.children.NumberLiteral[0].image, 10),
      sides: parseInt(cst.children.NumberLiteral[1].image, 10),
      fudge: null,
      custom: null,
      plugin: 'dice',
    };
  },
  dxDice: (cst) => {
    return {
      type: 'Dice',
      count: 1,
      sides: parseInt(cst.children.NumberLiteral[0].image, 10),
      fudge: null,
      custom: null,
      plugin: 'dice',
    };
  },
  dPercentDice: (cst) => {
    let count = 1;
    if (cst.children.NumberLiteral && cst.children.NumberLiteral.length > 0) {
      count = parseInt(cst.children.NumberLiteral[0].image, 10);
    }
    return {
      type: 'Dice',
      count,
      sides: 100,
      fudge: null,
      custom: null,
      plugin: 'dice',
    };
  },
  dFudgeDice: (cst) => {
    let count = 1;
    if (cst.children.NumberLiteral && cst.children.NumberLiteral.length > 0) {
      count = parseInt(cst.children.NumberLiteral[0].image, 10);
    }
    // dF, dF.1, dF.2, dF.3
    const fudgeMatch = cst.children.DF[0].image.match(/dF(?:\.(\d))?/);
    const fudge = fudgeMatch && fudgeMatch[1] ? parseInt(fudgeMatch[1], 10) : 0;
    return {
      type: 'Dice',
      count,
      sides: null,
      fudge,
      custom: null,
      plugin: 'dice',
    };
  },
  customDiceExpr: (cst) => {
    let count = 1;
    let offset = 0;
    if (cst.children.NumberLiteral && cst.children.NumberLiteral.length > 0 && cst.children.NumberLiteral[0].startOffset < cst.children.D[0].startOffset) {
      count = parseInt(cst.children.NumberLiteral[0].image, 10);
      offset = 1;
    }
    const custom = cst.children.NumberLiteral.slice(offset).map((n: any) => parseInt(n.image, 10));
    return {
      type: 'Dice',
      count,
      sides: null,
      fudge: null,
      custom,
      plugin: 'dice',
    };
  },
  computedDice: (cst) => {
    // (N)dX or Nd(X)
    if (cst.children.computedExpr && cst.children.NumberLiteral) {
      // (N)dX
      return {
        type: 'Dice',
        count: parseInt(cst.children.computedExpr[0].children.NumberLiteral[0].image, 10),
        sides: parseInt(cst.children.NumberLiteral[0].image, 10),
        fudge: null,
        custom: null,
        plugin: 'dice',
      };
    } else if (cst.children.NumberLiteral && cst.children.computedExpr) {
      // Nd(X)
      return {
        type: 'Dice',
        count: parseInt(cst.children.NumberLiteral[0].image, 10),
        sides: parseInt(cst.children.computedExpr[0].children.NumberLiteral[0].image, 10),
        fudge: null,
        custom: null,
        plugin: 'dice',
      };
    }
    throw new Error('Invalid computedDice CST');
  },
}; 