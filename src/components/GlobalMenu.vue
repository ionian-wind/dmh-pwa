<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import { useRouter } from 'vue-router';
import { Section } from '@/types';
import Button from '@/components/common/Button.vue';

const { t } = useI18n();
const moduleStore = useModuleStore();
const router = useRouter();

const currentModule = computed(() => moduleStore.currentModule);
const modulesSelect = computed(() => [
  { id: 'any', value: 'any', name: t('common.anyModule') },
  { id: 'none', value: 'none', name: t('common.noModule') },
  ...moduleStore.modules.map(({ id, name }) => ({ id, name, value: id }))
]);

const setCurrentModuleFilter = (filterValue: string) => {
  if (filterValue === 'any') {
    moduleStore.setCurrentModuleFilter('any');
  } else if (filterValue === 'none') {
    moduleStore.setCurrentModuleFilter('none');
  } else {
    moduleStore.setCurrentModuleFilter(filterValue);
  }
};

const navigateTo = (path: string) => {
  router.push(path);
};

const sections = [
  { section: Section.NOTES, label: t('navigation.notes'), path: '/notes' },
  { section: Section.PARTIES, label: t('navigation.parties'), path: '/parties' },
  { section: Section.MONSTERS, label: t('navigation.monsters'), path: '/monsters' },
  { section: Section.ENCOUNTERS, label: t('navigation.encounters'), path: '/encounters' },
  { section: Section.CHARACTERS, label: t('navigation.characters'), path: '/characters' },
  { section: Section.MODULES, label: t('navigation.modules'), path: '/modules' }
];

const isActive = (item: { section: Section, path: string }) => {
  const currentPath = router.currentRoute.value.path;

  return sections.some((mod) => mod.section === item.section && currentPath.startsWith(mod.path)) ?? currentPath.startsWith(item.path);
};
</script>

<template>
  <nav class="global-menu">
    <div class="module-selector-row">
      <div class="module-selector">
        <select v-model="moduleStore.currentModuleFilter" @change="setCurrentModuleFilter(($event.target as HTMLSelectElement)?.value || 'any')">
          <option v-for="module in modulesSelect" :key="module.id" :value="module.value">
            {{ module.name }}
          </option>
        </select>
      </div>
      <Button 
        variant="danger"
        size="small"
        class="clear-module-btn"
        @click="setCurrentModuleFilter('any')"
        v-if="moduleStore.currentModuleFilter !== 'any'"
      >
        {{ t('app.clear') }}
      </Button>
    </div>
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
  background: #1e1e2e;
  color: white;
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
  border: 1px solid #ddd;
  background: white;
  color: #333;
}

.clear-module-btn {
  margin-left: 0.5rem;
}

.menu-items {
  display: flex;
  gap: 1rem;
}

.menu-items .btn {
  background: #2d2d44;
  color: white;
  border: none;
}

.menu-items .btn:hover {
  background: #3d3d54;
}

.menu-items .btn.active {
  background: #4caf50;
}
</style> 
