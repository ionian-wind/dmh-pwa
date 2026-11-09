import type {
  AstNode,
  DicePlugin,
  EvalContext,
  EvalResult,
  TokenMap,
} from './contracts';
import { rollError } from './errors';
import { buildTokenVocabulary, type TokenVocabulary } from './lexer';
import { parseExpression, type ParseOptions, type ParseResult } from './parser';

export class PluginRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginRegistryError';
  }
}

export interface PluginRegistry {
  readonly plugins: readonly DicePlugin[];
  readonly vocabulary: TokenVocabulary;
  readonly tokens: TokenMap;
  /** `plugin name -> CST rule name` used for conversion dispatch. */
  readonly cstRules: ReadonlyMap<string, string>;
  parse(
    source: string,
    options?: Omit<ParseOptions, 'plugins' | 'vocabulary'>,
  ): ParseResult;
  evaluate(node: AstNode, context: EvalContext): EvalResult;
}

/**
 * Build a deterministic plugin registry. Token names and CST conversion rules
 * are shared namespaces; a conflict is a registration error, never a silent
 * override.
 */
export function createPluginRegistry(
  plugins: readonly DicePlugin[],
): PluginRegistry {
  const names = new Set<string>();
  const cstRules = new Map<string, string>();
  const ruleOwners = new Map<string, string>();

  for (const plugin of plugins) {
    if (!plugin.name.trim()) {
      throw new PluginRegistryError('plugin name must not be empty');
    }
    if (names.has(plugin.name)) {
      throw new PluginRegistryError(`duplicate plugin name: "${plugin.name}"`);
    }
    names.add(plugin.name);

    for (const rule of Object.keys(plugin.cstToAst ?? {})) {
      const owner = ruleOwners.get(rule);
      if (owner && owner !== plugin.name) {
        throw new PluginRegistryError(
          `CST rule "${rule}" is registered by both "${owner}" and "${plugin.name}"`,
        );
      }
      ruleOwners.set(rule, plugin.name);
      cstRules.set(rule, plugin.name);
    }
  }

  const vocabulary = buildTokenVocabulary(plugins);

  return {
    plugins: [...plugins],
    vocabulary,
    tokens: vocabulary.tokenMap,
    cstRules,
    parse(source, options = {}) {
      return parseExpression(source, { ...options, vocabulary });
    },
    evaluate(node, context) {
      const preferred = plugins.find((plugin) => plugin.name === node.plugin);
      const ordered = preferred
        ? [preferred, ...plugins.filter((plugin) => plugin !== preferred)]
        : plugins;
      for (const plugin of ordered) {
        const result = plugin.evaluate(node, context);
        if (result !== null) return result;
      }
      throw new Error(`no plugin handled AST node "${node.type}"`);
    },
  };
}

/** Validate a plugin standalone; useful in registration tests. */
export function assertPlugin(plugin: DicePlugin): void {
  if (!plugin.name.trim()) {
    throw new PluginRegistryError('plugin name must not be empty');
  }
  if (!Array.isArray(plugin.tokens)) {
    throw new PluginRegistryError(
      `plugin "${plugin.name}" must declare a token array`,
    );
  }
  if (typeof plugin.evaluate !== 'function') {
    throw new PluginRegistryError(
      `plugin "${plugin.name}" must implement evaluate()`,
    );
  }
}

/** Convert a validation error list to a registration error. */
export function registrationErrors(plugin: DicePlugin): string[] {
  const errors: string[] = [];
  if (!plugin.name.trim()) errors.push('plugin name must not be empty');
  if (!Array.isArray(plugin.tokens)) errors.push('tokens must be an array');
  if (typeof plugin.evaluate !== 'function') {
    errors.push('evaluate() is required');
  }
  for (const token of plugin.tokens) {
    if (!token?.name) errors.push(rollErrorCode('invalid token declaration'));
  }
  return errors;
}

function rollErrorCode(message: string): string {
  return rollError('INTERNAL', message, { pass: 'registration' }).code;
}
