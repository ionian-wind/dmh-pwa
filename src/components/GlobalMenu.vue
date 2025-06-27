<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import { useRouter } from 'vue-router';
import { Section } from '@/types';
import Button from '@/components/common/Button.vue';
import { useConfigStore } from '@/utils/configStore';

const moduleStore = useModuleStore();
const router = useRouter();
const configStore = useConfigStore();
const { t } = useI18n();

onMounted(async () => {
  await moduleStore.load();
});

const moduleOptions = computed(() => [
  { id: 'any', name: 'Any Module', value: 'any' },
  { id: 'none', name: 'No Module', value: 'none' },
  ...moduleStore.items.map(({ id, name }) => ({ id, name, value: id }))
]);

const navigateTo = (path: string) => {
  router.push(path);
};

const sections = [
  { section: Section.NOTES, label: t('navigation.notes'), path: '/notes' },
  { section: Section.CHARACTERS, label: t('navigation.characters'), path: '/characters' },
  { section: Section.PARTIES, label: t('navigation.parties'), path: '/parties' },
  { section: Section.MODULES, label: t('navigation.modules'), path: '/modules' },
  { section: Section.MONSTERS, label: t('navigation.monsters'), path: '/monsters' },
  { section: Section.ENCOUNTERS, label: t('navigation.encounters'), path: '/encounters' },
];

const isActive = (item: { section: Section, path: string }) => {
  const currentPath = router.currentRoute.value.path;

  return sections.some((mod) => mod.section === item.section && currentPath.startsWith(mod.path)) ?? currentPath.startsWith(item.path);
};
</script>

<template>
  <nav class="global-menu">
    <div class="menu-items">
      <Button
        v-for="item in sections"
        :key="item.section"
        variant="secondary"
        size="small"
        @click="navigateTo(item.path)"
        :class="{ active: isActive(item) }"
      >
        {{ item.label }}
      </Button>
    </div>
  </nav>
</template>

<style scoped>
.global-menu {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.module-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.module-selector {
  flex: 1;
}

.module-selector select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
}

.clear-module-btn {
  background: none;
  border: none;
  color: var(--color-text-inverse);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1rem;
}

.clear-module-btn:hover {
  color: var(--color-danger);
}

.menu-items {
  display: flex;
  gap: 1rem;
}

.menu-items .btn {
  background: var(--color-primary-dark);
  color: var(--color-text-inverse);
  border: none;
}

.menu-items .btn:hover {
  background: var(--color-secondary);
}

.menu-items .btn.active {
  background: var(--color-success);
}
</style> 
