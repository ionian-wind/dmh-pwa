import { CstParser } from 'chevrotain';
import { CstToAstHandlerMap } from './utils/cstAstConverter';

export interface ITokenMap {
  [key: string]: any;
}

export interface IParser extends CstParser {
  [key: string]: any;
}

export interface IPlugin {
  name: string;
  tokens: any[];
  parser?: any;
  parserClass?: any;
  topRule?: string;
  evaluator?: any;
  extract?: (ast: any) => Record<string, any>;
  canParseToken?: (token: any, parser: any) => boolean;
  parseTopRule?: (parser: any, coreFallback: () => any) => any;
  getCstToAst?: () => any;
  getLexerDefinition?(): any;
  getTokenMetadata?(token: any): { type: string };
} 