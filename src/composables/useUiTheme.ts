import { computed, readonly, ref } from 'vue';
import { useConfigStore } from '@/utils/configStore';

const systemPrefersDark = ref(false);

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = media.matches;
  media.addEventListener('change', (event) => {
    systemPrefersDark.value = event.matches;
  });
}

/**
 * Effective light/dark state for components that need to know the resolved
 * theme (for example the Monaco editor), including the "auto" mode.
 */
export function useUiTheme() {
  const configStore = useConfigStore();

  const isDark = computed(
    () =>
      configStore.uiTheme === 'dark' ||
      (configStore.uiTheme === 'auto' && systemPrefersDark.value),
  );

  return {
    isDark: readonly(isDark),
    uiTheme: computed(() => configStore.uiTheme),
  };
}
