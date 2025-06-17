<script setup lang="ts">
import { ref, computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { useRouter } from 'vue-router';
import { Section } from '@/types';
import Button from '@/components/common/Button.vue';

const moduleStore = useModuleStore();
const router = useRouter();

const currentModule = computed(() => moduleStore.currentModule);
const modulesSelect = computed(() => [
  { id: 'any', value: 'any', name: 'Any module' },
  { id: 'none', value: 'none', name: 'No module' },
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
  { section: Section.NOTES, label: 'Notes', path: '/notes' },
  { section: Section.PARTIES, label: 'Parties', path: '/parties' },
  { section: Section.MONSTERS, label: 'Monsters', path: '/monsters' },
  { section: Section.ENCOUNTERS, label: 'Encounters', path: '/encounters' },
  { section: Section.CHARACTERS, label: 'Characters', path: '/characters' },
  { section: Section.MODULES, label: 'Modules', path: '/modules' }
];

const isActive = (item: { section: Section, path: string }) => {
  const currentPath = router.currentRoute.value.path;

  return sections.some((mod) => mod.section === item.section && currentPath.startsWith(mod.path)) ?? currentPath.startsWith(item.path);
};
</script>

<template>
  <nav class="global-menu">
    <div class="module-selector">
      <select v-model="moduleStore.currentModuleFilter" @change="setCurrentModuleFilter(($event.target as HTMLSelectElement)?.value || 'any')">
        <option v-for="module in modulesSelect" :key="module.id" :value="module.value">
          {{ module.name }}
        </option>
      </select>
    </div>
    <div v-if="currentModule" class="current-module">
      <span>Current Module: {{ currentModule.name }}</span>
      <Button 
        variant="danger"
        size="small"
        @click="setCurrentModuleFilter('any')"
      >
        Clear
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

.module-selector {
  margin-bottom: 1rem;
}

.module-selector select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
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

.current-module {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #2d2d44;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style> 
