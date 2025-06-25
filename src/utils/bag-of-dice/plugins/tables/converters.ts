import { CstToAstHandlerMap } from '../../utils/cstAstConverter';

export type TableRollNode = {
  type: 'TableRoll';
  count: number | null;
  table: string;
  plugin: 'tables';
};

export const tableCstToAstHandlers: CstToAstHandlerMap = {
  tableRoll: (cst: any) => {
    const num = cst.children.NumberLiteral?.[0]?.image;
    const table = cst.children.Identifier?.[0]?.image;
    return {
      type: 'TableRoll',
      count: num ? parseInt(num, 10) : null,
      table,
      plugin: 'tables',
    };
  },
}; 