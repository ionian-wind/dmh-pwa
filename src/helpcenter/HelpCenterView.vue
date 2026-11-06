<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import HelpNav from './HelpNav.vue';
import { getHelpNav, getHelpPage, type HelpLocale } from './content';

const route = useRoute();
const router = useRouter();
const { locale, t } = useI18n();

const helpLocale = computed<HelpLocale>(() =>
  locale.value === 'ru' ? 'ru' : 'en',
);

const routePath = computed(() => {
  const match = route.params.pathMatch;
  return (
    Array.isArray(match) ? match.join('/') : (match as string) || ''
  ).replace(/^\/+|\/+$/g, '');
});

const page = computed(() => getHelpPage(helpLocale.value, routePath.value));
const nav = computed(() => getHelpNav(helpLocale.value));

watch([routePath, helpLocale], () => {
  window.scrollTo({ top: 0, behavior: 'auto' });
});

function openHelpRoot() {
  void router.push('/help');
}

function onContentClick(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const target = event.target as Element | null;
  const anchor = target?.closest('a');
  const href = anchor?.getAttribute('href');
  if (!href) return;
  if (anchor?.getAttribute('target') === '_blank') return;

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const routeHref =
    basePath && href.startsWith(`${basePath}/help`)
      ? href.slice(basePath.length)
      : href;
  if (!routeHref.startsWith('/help')) return;

  event.preventDefault();
  void router.push(routeHref);
}
</script>

<template>
  <div class="help-center q-pa-md">
    <div class="help-layout">
      <aside class="help-sidebar">
        <QCard flat bordered>
          <QCardSection class="q-py-sm">
            <div class="text-subtitle2 text-weight-medium">
              {{ t('help.title') }}
            </div>
          </QCardSection>
          <QSeparator />
          <QCardSection class="q-pa-sm">
            <QList dense>
              <QItem
                clickable
                class="help-nav-item"
                :class="{ 'help-nav-item--active': !page?.path }"
                @click="openHelpRoot"
              >
                <QItemSection>{{ t('help.title') }}</QItemSection>
              </QItem>
            </QList>
            <HelpNav :nodes="nav" :active="page?.path ?? ''" />
          </QCardSection>
        </QCard>
      </aside>

      <main class="help-content">
        <template v-if="page">
          <div class="text-caption text-grey-7 q-mb-xs">
            <router-link to="/help">{{ t('help.title') }}</router-link>
            <template v-if="page.path">
              <span> / </span>
              <span>{{ page.title }}</span>
            </template>
          </div>

          <h1 class="text-h4 q-mt-none q-mb-sm">{{ page.title }}</h1>
          <p v-if="page.description" class="text-subtitle1 text-grey-7 q-mb-lg">
            {{ page.description }}
          </p>

          <div
            class="help-markdown"
            v-html="page.html"
            @click="onContentClick"
          />
        </template>

        <div v-else class="text-center q-pa-xl">
          <div class="text-h5 q-mb-md">{{ t('help.notFound') }}</div>
          <router-link to="/help">{{ t('help.back') }}</router-link>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.help-center {
  max-width: 1120px;
  margin: 0 auto;
}

.help-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.help-sidebar {
  position: sticky;
  top: 72px;
}

.help-nav-item {
  border-radius: 8px;
}

.help-nav-item--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.help-content {
  min-width: 0;
}

.help-markdown {
  line-height: 1.7;
}

:deep(.help-markdown h2) {
  margin: 1.8em 0 0.6em;
  font-size: 1.35rem;
}

:deep(.help-markdown h3) {
  margin: 1.4em 0 0.5em;
  font-size: 1.1rem;
}

:deep(.help-markdown p),
:deep(.help-markdown ul),
:deep(.help-markdown ol) {
  margin-bottom: 1em;
}

:deep(.help-markdown img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.25em 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

:deep(.help-markdown a) {
  color: var(--color-primary);
}

:deep(.help-markdown code) {
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: #f1f3f6;
}

:deep(.help-markdown pre) {
  overflow-x: auto;
  padding: 1em;
  border-radius: 8px;
  background: #f1f3f6;
}

@media (max-width: 800px) {
  .help-layout {
    grid-template-columns: 1fr;
  }

  .help-sidebar {
    position: static;
  }
}
</style>
