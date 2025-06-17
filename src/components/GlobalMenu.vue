<script setup lang="ts">
import { ref, computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { useRouter } from 'vue-router';
import { Section } from '@/types';
import Button from './Button.vue';

const moduleStore = useModuleStore();
const router = useRouter();

const currentModule = computed(() => moduleStore.modules.find(m => m.id === moduleStore.currentModuleId));
const modulesSelect = computed(() => [{id: null, value: '-', name: 'Module not specified' }, ...moduleStore.modules.map(({ id, name }) => ({ id, name, value: id }))]);

const setCurrentModule = (moduleId: string | null) => moduleStore.setCurrentModule(moduleId === '-' ? null : moduleId);

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
      <select v-model="moduleStore.currentModuleId" @change="setCurrentModule(($event.target as HTMLSelectElement)?.value || null)">
<!--        <option :value="null">All Modules</option>-->
        <option v-for="module in modulesSelect" :key="module.id || 'null'" :value="module.value">
          {{ module.name }}
        </option>
      </select>
    </div>
    <div v-if="currentModule" class="current-module">
      <span>Current Module: {{ currentModule.name }}</span>
      <Button 
        variant="danger"
        size="small"
        @click="setCurrentModule('-')"
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
  margin-bottom: 2rem;
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
