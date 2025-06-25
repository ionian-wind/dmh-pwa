import { IPlugin } from '../types';

export abstract class BasePlugin implements IPlugin {
  public readonly tokens: any[] = [];
  public readonly topRule?: string;

  
  protected constructor(public readonly name: string) {

  }

  extract(ast: any): Record<string, any> {
    return {};
  }

  canParseToken(token: any, parser: any): boolean {
    return false;
  }

  parseTopRule(parser: any, coreFallback: () => any): any {
    if (this.topRule && parser[this.topRule]) {
      return parser[this.topRule]();
    }
    return coreFallback();
  }

  evaluator(node: any, ...args: any[]): any {
    return undefined;
  }

  getCstToAst(): any {
    return undefined;
  }
} 