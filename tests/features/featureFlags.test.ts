import { describe, expect, it } from 'vitest';
import {
  FEATURES,
  assertFeatureDependencies,
  featureDefines,
  parseFeatureValue,
  resolveFeatureFlags,
} from '../../scripts/feature-catalog.mjs';
import { createFeaturePlugin } from '../../scripts/feature-flags-plugin.mjs';

describe('feature catalog', () => {
  it('defaults flags to enabled and parses accepted values', () => {
    const flags = resolveFeatureFlags({});
    expect(FEATURES.every((feature: { id: string }) => flags[feature.id])).toBe(
      true,
    );
    expect(parseFeatureValue(undefined, 'X')).toBe(true);
    expect(parseFeatureValue('true', 'X')).toBe(true);
    expect(parseFeatureValue('1', 'X')).toBe(true);
    expect(parseFeatureValue('false', 'X')).toBe(false);
    expect(parseFeatureValue('0', 'X')).toBe(false);
  });

  it('rejects invalid and unknown flags', () => {
    expect(() => parseFeatureValue('yes', 'VITE_FEATURE_NOTES')).toThrow(
      'Invalid VITE_FEATURE_NOTES',
    );
    expect(() => resolveFeatureFlags({ VITE_FEATURE_UNKNOWN: 'true' })).toThrow(
      'Unknown feature flag',
    );
  });

  it('fails invalid dependency combinations', () => {
    const flags = resolveFeatureFlags({});
    flags.characters = false;
    flags.parties = true;
    expect(() => assertFeatureDependencies(flags)).toThrow(
      'VITE_FEATURE_PARTIES=true requires VITE_FEATURE_CHARACTERS=true',
    );
  });

  it('emits real boolean defines', () => {
    const flags = resolveFeatureFlags({});
    const defines = featureDefines(flags);
    expect(defines.__FEATURE_NOTES__).toBe('true');
    expect(defines.__FEATURE_JUKEBOX__).toBe('true');
    flags.jukebox = false;
    expect(featureDefines(flags).__FEATURE_JUKEBOX__).toBe('false');
  });
});

describe('feature virtual modules', () => {
  it('imports enabled integrations only', () => {
    const flags = resolveFeatureFlags({});
    const plugin = createFeaturePlugin(flags);
    const id = plugin.resolveId('virtual:feature-routes');
    const code = plugin.load(id);
    expect(code).toContain('@/features/notes/integration');
    expect(code).toContain('@/features/probability/integration');
  });

  it('omits disabled integrations', () => {
    const flags = resolveFeatureFlags({
      VITE_FEATURE_NOTES: 'false',
      VITE_FEATURE_PROBABILITY: 'false',
    });
    const plugin = createFeaturePlugin(flags);
    const id = plugin.resolveId('virtual:feature-routes');
    const code = plugin.load(id);
    expect(code).not.toContain('@/features/notes/integration');
    expect(code).not.toContain('@/features/probability/integration');
    expect(code).toContain('@/features/characters/integration');
  });

  it('only exposes enabled link kinds', () => {
    const flags = resolveFeatureFlags({
      VITE_FEATURE_CHARACTERS: 'false',
      VITE_FEATURE_PARTIES: 'false',
      VITE_FEATURE_ENCOUNTERS: 'false',
    });
    const plugin = createFeaturePlugin(flags);
    const id = plugin.resolveId('virtual:feature-links');
    const code = plugin.load(id);
    expect(code).toContain('@/features/notes/integration');
    expect(code).not.toContain('@/features/characters/integration');
  });
});
