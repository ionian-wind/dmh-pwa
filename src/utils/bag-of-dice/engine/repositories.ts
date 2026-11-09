import type {
  AbilityRepository,
  AttributeRepository,
  MacroDefinition,
  MacroRepository,
  Repositories,
  TableRepository,
} from './contracts';

/** A no-op repository set for math-only rolls and unit tests. */
export function createEmptyRepositories(): Repositories {
  const macros: MacroRepository = {
    async get() {
      return undefined;
    },
  };
  const abilities: AbilityRepository = {
    async get() {
      return undefined;
    },
  };
  const attributes: AttributeRepository = {
    async get() {
      return undefined;
    },
  };
  const tables: TableRepository = {
    async get() {
      return undefined;
    },
  };
  return { macros, abilities, attributes, tables };
}

export function createStaticRepositories(data: {
  macros?: Record<string, string>;
  abilities?: Record<string, string>;
  attributes?: Record<string, string | number>;
  tables?: Repositories['tables'];
}): Repositories {
  const empty = createEmptyRepositories();
  const macros: MacroRepository = {
    async get(name) {
      const command = lookupCaseInsensitive(data.macros, name);
      return command === undefined
        ? undefined
        : {
            name,
            command: String(command),
            source: 'user',
          };
    },
  };
  const abilities: AbilityRepository = {
    async get(character, ability) {
      const command = lookupCaseInsensitive(
        data.abilities,
        `${character}|${ability}`,
      );
      return command === undefined
        ? undefined
        : { character, name: ability, command: String(command) };
    },
  };
  const attributes: AttributeRepository = {
    async get(character, attribute, options) {
      const value = lookupCaseInsensitive(
        data.attributes,
        `${character}|${attribute}${options?.max ? '|max' : ''}`,
      );
      return value === undefined ? undefined : { value };
    },
  };
  return {
    macros,
    abilities,
    attributes,
    tables: data.tables ?? empty.tables,
  };
}

function lookupCaseInsensitive(
  map: Record<string, string | number> | undefined,
  key: string,
): string | number | undefined {
  if (!map) return undefined;
  const wanted = key.toLowerCase();
  for (const [candidate, value] of Object.entries(map)) {
    if (candidate.toLowerCase() === wanted) return value;
  }
  return undefined;
}

/**
 * Ordered macro repository used by callers that want user > pack > import >
 * builtin precedence. The first repository that returns a definition wins;
 * lower-priority hits are reported as shadowed so the engine can warn.
 */
export class CompositeMacroRepository implements MacroRepository {
  private readonly sources: MacroRepository[];

  constructor(sources: MacroRepository[]) {
    this.sources = [...sources];
  }

  async get(name: string): Promise<MacroDefinition | undefined> {
    return (await this.resolve(name)).definition;
  }

  async resolve(
    name: string,
  ): Promise<{ definition?: MacroDefinition; shadowed: MacroDefinition[] }> {
    const hits: MacroDefinition[] = [];
    for (const source of this.sources) {
      const definition = await source.get(name);
      if (definition) hits.push(definition);
    }
    return {
      ...(hits[0] ? { definition: hits[0] } : {}),
      shadowed: hits.slice(1),
    };
  }
}
