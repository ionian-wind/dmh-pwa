<script setup lang="ts">
import type { Encounter } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import {computed, onMounted} from 'vue';
import Button from '@/components/common/Button.vue';
import { useModuleStore } from '@/stores/modules';

const props = defineProps<{ encounter: Encounter }>();
const emit = defineEmits(['view', 'edit', 'delete', 'run-combat', 'copy']);
const moduleStore = useModuleStore();

const moduleName = computed(() => {
  if (!props.encounter.moduleId) return 'No Module';
  const module = moduleStore.items.find(m => m.id === props.encounter.moduleId);
  return module ? module.name : 'Unknown Module';
});

const monstersCount = computed(() => {
  const monsters = props.encounter.monsters || {};
  
  // Handle different possible data structures
  let kinds = 0;
  let total = 0;
  
  if (typeof monsters === 'object' && monsters !== null) {
    const keys = Object.keys(monsters);
    kinds = keys.length;
    
    // Sum up all the values, ensuring they're numbers
    total = Object.values(monsters).reduce((sum, value) => {
      const count = typeof value === 'number' ? value : 0;
      return sum + count;
    }, 0);
  }
  
  return `${kinds} (${total})`;
});

onMounted(async () => {
  await moduleStore.load();
});

function handleView() { emit('view', props.encounter); }
function handleEdit() { emit('edit', props.encounter); }
function handleDelete() { emit('delete', props.encounter); }
function handleRunCombat() {
  emit('run-combat', props.encounter);
}
function handleCopy() { emit('copy', props.encounter); }
</script>
<template>
  <BaseCard showEdit showDelete showView @view="handleView" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy">
    <template #header>
      <h3>{{ encounter.name }}</h3>
    </template>
    <div class="encounter-meta">
      <span class="meta-item"><span class="label">Module:</span> <span class="value">{{ moduleName }}</span></span>
    </div>
    <p v-if="encounter.description" class="description">{{ encounter.description }}</p>
    <div class="monsters-summary">
      <span class="label">Monsters:</span>
      <span class="value">{{ monstersCount }}</span>
    </div>
    <template #actions>
      <Button size="small" variant="success" @click="handleRunCombat" title="Run Combat">
        <i class="ra ra-crossed-swords"></i>
      </Button>
    </template>
  </BaseCard>
</template>
<style scoped>
.encounter-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}
.value {
  color: var(--color-text);
  font-weight: 500;
}
.description {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.monsters-summary {
  margin-top: 0.5rem;
}

.run-combat-btn {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--border-radius);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.run-combat-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style> 
