<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import MonsterEditor from '@/components/MonsterEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const router = useRouter();
const monsterStore = useMonsterStore();
const showEditor = ref(false);

// Monster mention indexation store
const mentionsStore = useMentionsStore();

const monster = ref<Monster | null>(null);
const loading = computed(() => !monsterStore.isLoaded);
const notFound = computed(() => monsterStore.isLoaded && !monster.value);

function updateMonsterFromStore() {
  if (!monsterStore.isLoaded) {
    return;
  }
  const found = monsterStore.getById(route.params.id as string);
  if (found) {
    monster.value = found;
  } else {
    router.push('/monsters');
  }
}

watch([
  () => monsterStore.items,
  () => monsterStore.isLoaded
], updateMonsterFromStore, { immediate: true });

const handleEditClick = () => {
  showEditor.value = true;
};

const handleSave = async (updatedMonster: Monster) => {
  if (!monster.value) return;
  await monsterStore.update(monster.value.id, updatedMonster);
  showEditor.value = false;
  updateMonsterFromStore();
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!monster.value) return;
  await monsterStore.remove(monster.value.id);
  router.push('/monsters');
};

// Computed properties for BaseEntityView
const monsterTitle = computed(() => monster.value?.name || '');

const mentions = computed(() => {
  if (!monster.value) return [];
  return mentionsStore.getLinks({ kind: 'monster', id: monster.value.id });
});
const mentionedInEntities = computed(() => {
  if (!monster.value) return [];
  return mentionsStore.getBacklinks({ kind: 'monster', id: monster.value.id });
});

onMounted(async () => {
  monsterStore.load();
});
</script>

<template>
  <div class="view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <div v-if="loading" class="loading-state">Loading...</div>
      <NotFoundView v-else-if="notFound" />
      <BaseEntityView
        v-else
        :entity="monster"
        entity-name="Monster"
        list-route="/monsters"
        :on-delete="handleDelete"
        :on-edit="handleEditClick"
        :is-editing="showEditor"
        :title="monsterTitle"
        :not-found="notFound"
      >
        <!-- Monster Content -->
        <div v-if="monster" class="monster-sheet">
          <!-- Notes -->
          <section v-if="monster.notes" class="sheet-section notes">
            <h2>Notes</h2>
            <div class="notes-content">
              <p>{{ monster.notes }}</p>
            </div>
          </section>
        </div>

        <!-- Editor Modal -->
        <template #editor>
          <MonsterEditor
            :isOpen="showEditor"
            :monster="monster"
            @submit="handleSave"
            @cancel="handleCancel"
          />
        </template>
      </BaseEntityView>
    </div>
    <aside v-if="!notFound && !loading" style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentions" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
  </div>
</template>

<style scoped>
.monster-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.sheet-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.sheet-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.sheet-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

/* Basic Information */
.info-grid {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  font-weight: 500;
  color: var(--color-text);
}

.info-item span {
  color: var(--color-text-light);
}

/* Notes */
.notes-content {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
