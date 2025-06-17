<script setup lang="ts">
import { computed } from 'vue';
import type { Party } from '@/types';
import { useModuleStore } from '@/stores/modules';
import BaseCard from '@/components/common/BaseCard.vue';;
import Button from '@/components/common/Button.vue';

const props = defineProps<{ party: Party }>();
const emit = defineEmits(['edit', 'delete', 'view']);
const moduleStore = useModuleStore();

function handleView() { emit('view', props.party); }
function handleEdit() { emit('edit', props.party); }
function handleDelete() { emit('delete', props.party); }

const partyModules = computed(() => {
  const moduleIds = props.party.moduleIds || [];
  return moduleIds
    .map(id => moduleStore.modules.find(m => m.id === id))
    .filter(m => m !== undefined)
    .map(m => m!.name);
});
</script>
<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
      <h3>{{ party.name }}</h3>
    </template>
    <p v-if="party.description" class="description">{{ party.description }}</p>
    <div class="party-meta">
      <span class="character-count">{{ (party.characters || []).length }} characters</span>
      <span v-if="partyModules.length > 0" class="modules">
        {{ partyModules.join(', ') }}
      </span>
    </div>
  </BaseCard>
</template>
<style scoped>
.description {
  margin: 0 0 1rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.party-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
}

.character-count {
  font-weight: 500;
  color: var(--color-primary);
}

.modules {
  font-style: italic;
}

.party-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 
