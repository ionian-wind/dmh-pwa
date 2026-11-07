<script setup lang="ts">
import { computed, inject } from 'vue';

const props = defineProps<{
  label: string;
  screenMenu?: boolean;
}>();

const closeScreen = inject<() => void>('close-screen', () => {});

// The help center lives at <app>/help/, so strip that suffix to get the app.
const appHref = computed(() => {
  const path = import.meta.env.BASE_URL.replace(/\/help\/$/, '/');

  // When the VitePress dev server is opened directly, the app is still on the
  // Vite dev port. Avoid sending users to /dmh-pwa on the help-only server.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.port === '5174') {
      url.port = '5173';
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString();
    }
  }

  return path;
});
// target="_self" on the anchor opts out of VitePress SPA routing, so the app
// shell is loaded as a full page instead of being handled as a help route.
</script>

<template>
  <a
    :class="props.screenMenu ? 'help-open-app-screen' : 'help-open-app'"
    :href="appHref"
    target="_self"
    @click="closeScreen"
  >
    {{ props.label }}
  </a>
</template>

<style scoped>
.help-open-app {
  display: flex;
  align-items: center;
  padding: 0 12px;
  line-height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  transition: color 0.25s;
}

.help-open-app:hover {
  color: var(--vp-c-brand-1);
}

.help-open-app-screen {
  display: block;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 12px 0 11px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition:
    border-color 0.25s,
    color 0.25s;
}

.help-open-app-screen:hover {
  color: var(--vp-c-brand-1);
}
</style>
