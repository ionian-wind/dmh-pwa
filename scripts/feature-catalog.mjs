export const FEATURES = [
  {
    id: 'notes',
    envKey: 'VITE_FEATURE_NOTES',
    requires: [],
    integration: '@/features/notes/integration',
    ownership: [
      'src/notes/',
      'src/stores/notes.ts',
      'src/schemas/note.schema.json',
    ],
  },
  {
    id: 'characters',
    envKey: 'VITE_FEATURE_CHARACTERS',
    requires: [],
    integration: '@/features/characters/integration',
    ownership: [
      'src/characters/',
      'src/stores/characters.ts',
      'src/schemas/character.schema.json',
    ],
  },
  {
    id: 'parties',
    envKey: 'VITE_FEATURE_PARTIES',
    requires: ['characters'],
    integration: '@/features/parties/integration',
    ownership: [
      'src/parties/',
      'src/stores/parties.ts',
      'src/schemas/party.schema.json',
    ],
  },
  {
    id: 'monsters',
    envKey: 'VITE_FEATURE_MONSTERS',
    requires: [],
    integration: '@/features/monsters/integration',
    ownership: [
      'src/monsters/',
      'src/stores/monsters.ts',
      'src/schemas/monster.schema.json',
    ],
  },
  {
    id: 'encounters',
    envKey: 'VITE_FEATURE_ENCOUNTERS',
    requires: ['monsters', 'characters', 'parties'],
    integration: '@/features/encounters/integration',
    ownership: [
      'src/encounters/',
      'src/stores/encounters.ts',
      'src/stores/combats.ts',
      'src/schemas/encounter.schema.json',
      'src/schemas/combat.schema.json',
    ],
  },
  {
    id: 'modules',
    envKey: 'VITE_FEATURE_MODULES',
    requires: ['notes', 'ambient'],
    integration: '@/features/modules/integration',
    ownership: [
      'src/modules/',
      'src/stores/modules.ts',
      'src/components/Tree/',
      'src/schemas/module.schema.json',
    ],
  },
  {
    id: 'maps',
    envKey: 'VITE_FEATURE_MAPS',
    requires: [],
    integration: '@/features/maps/integration',
    ownership: ['src/maps/'],
  },
  {
    id: 'jukebox',
    envKey: 'VITE_FEATURE_JUKEBOX',
    requires: [],
    integration: '@/features/jukebox/integration',
    ownership: ['src/jukebox/'],
  },
  {
    id: 'ambient',
    envKey: 'VITE_FEATURE_AMBIENT',
    requires: [],
    integration: '@/features/ambient/integration',
    ownership: ['src/ambient-sound/'],
  },
  {
    id: 'timers',
    envKey: 'VITE_FEATURE_TIMERS',
    requires: [],
    integration: '@/features/timers/integration',
    ownership: [
      'src/timers/',
      'src/stores/timers.ts',
      'src/schemas/timer.schema.json',
    ],
  },
  {
    id: 'calculator',
    envKey: 'VITE_FEATURE_CALCULATOR',
    requires: [],
    integration: '@/features/calculator/integration',
    ownership: ['src/calculator/'],
  },
  {
    id: 'probability',
    envKey: 'VITE_FEATURE_PROBABILITY',
    requires: [],
    integration: '@/features/probability/integration',
    ownership: [
      'src/probability-calculator/',
      'src/utils/dice-probability-calculator/',
    ],
  },
];

export const FEATURE_IDS = FEATURES.map((feature) => feature.id);
export const FEATURE_BY_ID = new Map(
  FEATURES.map((feature) => [feature.id, feature]),
);

export function parseFeatureValue(value, envKey) {
  if (value === undefined || value === '') return true;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Invalid ${envKey}="${value}". Use true/false or 1/0.`);
}

export function resolveFeatureFlags(env) {
  const knownKeys = new Set(FEATURES.map((feature) => feature.envKey));
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_FEATURE_') && !knownKeys.has(key)) {
      throw new Error(`Unknown feature flag ${key}.`);
    }
  }

  const flags = {};
  for (const feature of FEATURES) {
    flags[feature.id] = parseFeatureValue(env[feature.envKey], feature.envKey);
  }
  return flags;
}

export function assertFeatureDependencies(flags) {
  const errors = [];
  for (const feature of FEATURES) {
    if (!flags[feature.id]) continue;
    for (const required of feature.requires) {
      if (!flags[required]) {
        const requiredFeature = FEATURE_BY_ID.get(required);
        errors.push(
          `${feature.envKey}=true requires ${requiredFeature.envKey}=true`,
        );
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`Invalid feature combination:\n- ${errors.join('\n- ')}`);
  }
}

export function enabledFeatureIds(flags) {
  return FEATURES.filter((feature) => flags[feature.id]).map(
    (feature) => feature.id,
  );
}

export function featureDefines(flags) {
  return Object.fromEntries(
    FEATURES.map((feature) => [
      `__FEATURE_${feature.id.toUpperCase()}__`,
      JSON.stringify(!!flags[feature.id]),
    ]),
  );
}
