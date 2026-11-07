import {
  FEATURES,
  assertFeatureDependencies,
  enabledFeatureIds,
  resolveFeatureFlags,
} from './feature-catalog.mjs';

const VIRTUAL_PREFIX = '\0virtual:feature-';

function virtualId(name) {
  return `${VIRTUAL_PREFIX}${name}`;
}

function integrationImports(enabled, exportName) {
  return enabled
    .map(
      (feature, index) =>
        `import { ${exportName} as ${exportName}${index} } from '${feature.integration}';`,
    )
    .join('\n');
}

function integrationValues(enabled, exportName, fallback) {
  return enabled
    .map((_, index) => `${exportName}${index}`)
    .join(` ?? ${fallback}, `);
}

export function createFeaturePlugin(flags) {
  assertFeatureDependencies(flags);
  const enabled = FEATURES.filter((feature) => flags[feature.id]);

  return {
    name: 'dmh-feature-flags',
    resolveId(id) {
      if (id.startsWith('virtual:feature-')) {
        return virtualId(id.slice('virtual:'.length));
      }
      return null;
    },
    generateBundle(_options, bundle) {
      if (process.env.FEATURE_AUDIT !== '1') return;
      const disabled = FEATURES.filter((feature) => !flags[feature.id]);
      const violations = [];
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const moduleId of Object.keys(output.modules ?? {})) {
          const normalized = moduleId.replace(/\\/g, '/');
          for (const feature of disabled) {
            const prefixes = [
              ...feature.ownership,
              `src/features/${feature.id}/`,
            ];
            if (prefixes.some((prefix) => normalized.includes(prefix))) {
              violations.push(`${feature.id}: ${moduleId}`);
            }
          }
        }
      }
      if (violations.length > 0) {
        this.error(
          `Disabled feature code found in the bundle:\n${[
            ...new Set(violations),
          ].join('\n')}`,
        );
      }
    },
    load(id) {
      if (id === virtualId('feature-flags')) {
        const featureObject = Object.fromEntries(
          FEATURES.map((feature) => [feature.id, !!flags[feature.id]]),
        );
        return [
          `export const features = ${JSON.stringify(featureObject)};`,
          `export const enabledFeatures = ${JSON.stringify(
            enabledFeatureIds(flags),
          )};`,
          `export function isFeatureEnabled(id) { return features[id] === true; }`,
        ].join('\n');
      }

      if (id === virtualId('feature-routes')) {
        return `${integrationImports(enabled, 'routes')}
export const featureRoutes = [${enabled
          .map((_, index) => `...(routes${index} ?? [])`)
          .join(', ')}];`;
      }

      if (id === virtualId('feature-navigation')) {
        return `${integrationImports(enabled, 'navigation')}
export const featureNavigation = [${enabled
          .map((_, index) => `...(navigation${index} ?? [])`)
          .join(', ')}];`;
      }

      if (id === virtualId('feature-home-cards')) {
        return `${integrationImports(enabled, 'homeCard')}
export const featureHomeCards = [${enabled
          .map((_, index) => `homeCard${index}`)
          .filter(Boolean)
          .join(', ')}].filter(Boolean);`;
      }

      if (id === virtualId('feature-home-actions')) {
        return `${integrationImports(enabled, 'homeActions')}
export const featureHomeActions = [${enabled
          .map((_, index) => `...(homeActions${index} ?? [])`)
          .join(', ')}];`;
      }

      if (id === virtualId('feature-entity-panels')) {
        if (!flags.ambient) {
          return 'export const entityScenesPanel = undefined;';
        }
        return `import { entityScenesPanel } from '@/features/ambient/integration';
export { entityScenesPanel };`;
      }

      if (id === virtualId('feature-globals')) {
        const hasLinking = enabled.some((feature) =>
          [
            'notes',
            'characters',
            'parties',
            'monsters',
            'encounters',
            'modules',
            'maps',
          ].includes(feature.id),
        );
        return `${integrationImports(enabled, 'globalComponents')}${
          hasLinking
            ? "\nimport FeatureLinking from '@/features/FeatureLinking.vue';"
            : ''
        }
export const featureGlobals = [
  ${hasLinking ? 'FeatureLinking,' : ''}
  ${enabled.map((_, index) => `...(globalComponents${index} ?? [])`).join(', ')}
];`;
      }

      if (id === virtualId('feature-links')) {
        return `${integrationImports(enabled, 'linkKinds')}
${integrationImports(enabled, 'dragKinds')}
export const featureLinkKinds = [${enabled
          .map((_, index) => `...(linkKinds${index} ?? [])`)
          .join(', ')}];
export const featureLinkIcons = Object.fromEntries(
  featureLinkKinds.map((option) => [option.kind, option.icon]),
);
export const featureDragKinds = [${enabled
          .map((_, index) => `...(dragKinds${index} ?? [])`)
          .join(', ')}];`;
      }

      return null;
    },
  };
}

export function loadFeatureFlags(env = process.env) {
  const flags = resolveFeatureFlags(env);
  assertFeatureDependencies(flags);
  return flags;
}
