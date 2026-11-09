import { config, mount, type MountingOptions } from '@vue/test-utils';
import type { Component } from 'vue';

function isI18nPlugin(plugin: unknown): boolean {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'global' in plugin &&
    'mode' in plugin
  );
}

/**
 * Mount a component with its own i18n instance without also installing the
 * global test i18n. Installing both on one app triggers Vue's
 * "already registered in target app" warnings.
 */
export function mountWithLocalI18n(
  component: Component,
  options: MountingOptions<any> = {},
) {
  const previous = config.global.plugins;
  config.global.plugins = previous.filter((plugin) => !isI18nPlugin(plugin));
  try {
    return mount(component, options);
  } finally {
    config.global.plugins = previous;
  }
}
