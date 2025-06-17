<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import RunCombat from '@/components/RunCombat.vue';
import Button from '@/components/Button.vue';

const route = useRoute();
const router = useRouter();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();

const encounter = ref<Encounter | null>(null);
const isEditorOpen = ref(false);

onMounted(async () => {
  const encounterId = route.params.id as string;
  await Promise.all([
    encounterStore.loadEncounters(),
    monsterStore.loadMonsters(),
    moduleStore.loadModules()
  ]);
  
  encounter.value = encounterStore.getEncounterById(encounterId);
  if (!encounter.value) {
    router.push('/encounters');
  }
});

const handleEdit = () => {
  isEditorOpen.value = true;
};

const handleDelete = async () => {
  if (!encounter.value) return;
  
  if (confirm(`Are you sure you want to delete the encounter "${encounter.value.name}"?`)) {
    await encounterStore.deleteEncounter(encounter.value.id);
    router.push('/encounters');
  }
};

const handleSubmit = async (updatedEncounter: Encounter) => {
  await encounterStore.updateEncounter(updatedEncounter);
  encounter.value = updatedEncounter;
  isEditorOpen.value = false;
};

const handleCancel = () => {
  isEditorOpen.value = false;
};

const getMonsterDetails = (monsterId: string) => {
  return monsterStore.monsters.find(m => m.id === monsterId);
};

const getModuleName = (moduleId: string | null) => {
  if (!moduleId) return 'No Module';
  const module = moduleStore.modules.find(m => m.id === moduleId);
  return module ? module.name : 'Unknown Module';
};
</script>

<template>
  <div v-if="encounter" class="encounter-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ encounter.name }}</h1>
        <div class="header-actions">
          <Button class="edit-btn" @click="handleEdit">Edit</Button>
          <Button variant="danger" class="delete-btn" @click="handleDelete">Delete</Button>
        </div>
      </div>
      <div class="encounter-meta">
        <span class="meta-item">
          <span class="label">Level:</span>
          <span class="value">{{ encounter.level }}</span>
        </span>
        <span class="meta-item">
          <span class="label">Difficulty:</span>
          <span class="value">{{ encounter.difficulty }}</span>
        </span>
        <span class="meta-item">
          <span class="label">XP:</span>
          <span class="value">{{ encounter.xp }}</span>
        </span>
        <span class="meta-item">
          <span class="label">Module:</span>
          <span class="value">{{ getModuleName(encounter.moduleId) }}</span>
        </span>
      </div>
    </div>

    <div class="view-content">
      <div class="content-section">
        <h2>Description</h2>
        <p class="description">{{ encounter.description || 'No description provided.' }}</p>
      </div>

      <div class="content-section">
        <h2>Monsters</h2>
        <div class="monsters-list">
          <div v-for="monster in encounter.monsters" :key="monster.id" class="monster-card">
            <div class="monster-header">
              <h3>{{ getMonsterDetails(monster.id)?.name || 'Unknown Monster' }}</h3>
              <span class="quantity">×{{ monster.quantity }}</span>
            </div>
            <div class="monster-details">
              <span class="detail-item">
                <span class="label">Type:</span>
                <span class="value">{{ getMonsterDetails(monster.id)?.type || 'Unknown' }}</span>
              </span>
              <span class="detail-item">
                <span class="label">CR:</span>
                <span class="value">{{ getMonsterDetails(monster.id)?.challengeRating || 'Unknown' }}</span>
              </span>
              <span class="detail-item">
                <span class="label">XP:</span>
                <span class="value">{{ (getMonsterDetails(monster.id)?.xp || 0) * monster.quantity }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="encounter.notes" class="content-section">
        <h2>Notes</h2>
        <p class="notes">{{ encounter.notes }}</p>
      </div>
    </div>

    <EncounterEditor
      :encounter="encounter"
      :is-open="isEditorOpen"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.encounter-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-content h1 {
  margin: 0;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.edit-btn {
  background: var(--color-primary);
  color: white;
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.edit-btn:hover {
  background: var(--color-primary-dark);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}

.encounter-meta {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-item .label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.meta-item .value {
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 500;
}

.view-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.content-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
}

.content-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.description,
.notes {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}

.monsters-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.monster-card {
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
}

.monster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.monster-header h3 {
  margin: 0;
  color: var(--color-text);
}

.quantity {
  background: var(--color-background-soft);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  color: var(--color-text);
  font-weight: 500;
}

.monster-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.detail-item .value {
  color: var(--color-text);
  font-weight: 500;
}
</style>
