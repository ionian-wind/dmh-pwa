<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import RunCombat from '@/components/RunCombat.vue';
import BaseEntityView from '@/components/BaseEntityView.vue';

const route = useRoute();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();

const encounter = ref<Encounter | null>(null);
const isEditorOpen = ref(false);
const notFound = ref(false);

onMounted(async () => {
  const encounterId = route.params.id as string;
  await Promise.all([
    encounterStore.loadEncounters(),
    monsterStore.loadMonsters(),
    moduleStore.loadModules()
  ]);
  
  encounter.value = encounterStore.getEncounterById(encounterId);
  if (!encounter.value) {
    notFound.value = true;
  }
});

const handleEdit = () => {
  isEditorOpen.value = true;
};

const handleDelete = async () => {
  if (!encounter.value) return;
  await encounterStore.deleteEncounter(encounter.value.id);
};

const handleSubmit = async (updatedEncounter: Omit<Encounter, 'id'>) => {
  if (!encounter.value) return;
  await encounterStore.updateEncounter(encounter.value.id, updatedEncounter);
  encounter.value = encounterStore.getEncounterById(encounter.value.id);
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

// Computed properties for BaseEntityView
const encounterTitle = computed(() => encounter.value?.name || '');
const encounterSubtitle = computed(() => {
  if (!encounter.value) return '';
  
  const parts = [
    `Level ${encounter.value.level}`,
    encounter.value.difficulty,
    `${encounter.value.xp} XP`,
    getModuleName(encounter.value.moduleId)
  ];
  
  return parts.join(' • ');
});
</script>

<template>
  <div class="encounter-view-container">
    <BaseEntityView
      :entity="encounter"
      entity-name="Encounter"
      list-route="/encounters"
      :on-delete="handleDelete"
      :on-edit="handleEdit"
      :is-editing="isEditorOpen"
      :title="encounterTitle"
      :subtitle="encounterSubtitle"
      :not-found="notFound"
    >
      <!-- Encounter Content -->
      <div v-if="encounter" class="encounter-content">
        <div class="content-section">
          <h2>Description</h2>
          <p class="description">{{ encounter.description || 'No description provided.' }}</p>
        </div>

        <div class="content-section">
          <h2>Combatants</h2>
          <div class="monsters-list">
            <div v-if="!encounter.combatants || encounter.combatants.length === 0" class="empty-state">
              <p>No combatants in this encounter</p>
            </div>
            <div v-else v-for="combatant in encounter.combatants" :key="combatant.id" class="monster-card">
              <div class="monster-header">
                <h3>{{ combatant.name }}</h3>
                <span class="quantity">{{ combatant.type }}</span>
              </div>
              <div class="monster-details">
                <span class="detail-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ combatant.type }}</span>
                </span>
                <span class="detail-item">
                  <span class="label">AC:</span>
                  <span class="value">{{ combatant.armorClass }}</span>
                </span>
                <span class="detail-item">
                  <span class="label">HP:</span>
                  <span class="value">{{ combatant.hitPoints.current }}/{{ combatant.hitPoints.maximum }}</span>
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

      <!-- Editor Modal -->
      <template #editor>
        <EncounterEditor
          :encounter="encounter"
          :is-open="isEditorOpen"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </template>
    </BaseEntityView>
  </div>
</template>

<style scoped>
.encounter-content {
  display: grid;
  gap: 2rem;
}

.content-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.content-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.description,
.notes {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.monsters-list {
  display: grid;
  gap: 1rem;
}

.monster-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.monster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.monster-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.quantity {
  background: var(--color-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  font-weight: bold;
}

.monster-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.detail-item .label {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
}

.detail-item .value {
  color: var(--color-text-light);
  font-size: 0.9rem;
}
</style>
