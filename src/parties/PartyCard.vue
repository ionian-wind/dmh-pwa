<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { Party } from '@/types';
import { useModuleStore } from '@/stores/modules';
import BaseCard from '@/components/common/BaseCard.vue';

const props = defineProps<{ party: Party }>();
const emit = defineEmits(['edit', 'delete', 'view', 'copy']);
const moduleStore = useModuleStore();

onMounted(async () => {
  await moduleStore.load();
});

function handleView() {
  emit('view', props.party);
}
function handleEdit() {
  emit('edit', props.party);
}
function handleDelete() {
  emit('delete', props.party);
}
function handleCopy() {
  emit('copy', props.party);
}

const modules = computed(() =>
  props.party.moduleIds
    .map((id) => moduleStore.items.find((m) => m.id === id))
    .filter(Boolean),
);
</script>
<template>
  <BaseCard
    showView
    showEdit
    showDelete
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :title="party.name"
  >
    <p v-if="party.description" class="description">{{ party.description }}</p>
    <div class="party-meta">
      <span class="character-count"
        >{{ (party.characters || []).length }} characters</span
      >
      <span v-if="modules.length > 0" class="modules">
        {{ modules.map((m) => m!.name).join(', ') }}
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
