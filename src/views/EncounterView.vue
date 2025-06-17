<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter, Monster } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import RunCombat from '@/components/RunCombat.vue';
import BaseEntityView from '@/components/BaseEntityView.vue';
import BaseModal from '@/components/BaseModal.vue';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import Button from '@/components/Button.vue';

const route = useRoute();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();

const encounter = ref<Encounter | null>(null);
const isEditorOpen = ref(false);
const showLinkModal = ref(false);
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

// Computed properties for monster linking
const allMonsters = computed(() => monsterStore.filteredMonsters);
const encounterMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return [];
  return allMonsters.value.filter(monster => 
    encounter.value!.monsters.includes(monster.id)
  );
});

const availableMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return allMonsters.value;
  return allMonsters.value.filter(monster => 
    !encounter.value!.monsters.includes(monster.id)
  );
});

const linkedMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return {};
  const linked = encounter.value.monsters;
  return allMonsters.value.reduce((acc, monster) => {
    acc[monster.id] = linked.includes(monster.id);
    return acc;
  }, {} as Record<string, boolean>);
});

const handleToggleMonster = (monster: Monster, isLinked: boolean) => {
  if (!encounter.value) return;
  if (isLinked) {
    encounterStore.addMonster(encounter.value.id, monster.id);
  } else {
    encounterStore.removeMonster(encounter.value.id, monster.id);
  }
  // Refresh the encounter data
  encounter.value = encounterStore.getEncounterById(encounter.value.id);
};

const isMonsterLinked = (monsterId: string) => {
  return linkedMonsters.value[monsterId];
};

// Computed properties for BaseEntityView
const encounterTitle = computed(() => encounter.value?.name || '');
const encounterSubtitle = computed(() => {
  if (!encounter.value) return '';
  
  const parts = [
    `Level ${encounter.value.level}`,
    encounter.value.difficulty,
    `${encounter.value.xp} XP`,
    getModuleName(encounter.value.moduleId),
    `${encounterMonsters.value.length} monsters`
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
          <div class="section-header">
            <h2>Monsters</h2>
            <Button @click="showLinkModal = true" class="link-btn">
              Link Monsters
            </Button>
          </div>
          <div v-if="encounterMonsters.length === 0" class="empty-state">
            <p>No monsters in this encounter yet</p>
          </div>
          <div v-else class="monsters-grid">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>CR</th>
                  <th>HP</th>
                  <th>AC</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="monster in encounterMonsters" :key="monster.id">
                  <td>{{ monster.name }}</td>
                  <td>{{ monster.type }}</td>
                  <td>{{ monster.challengeRating }}</td>
                  <td>{{ monster.hitPoints }}</td>
                  <td>{{ monster.armorClass }}</td>
                  <td>
                    <button class="unlink-btn" @click="handleToggleMonster(monster, false)">Unlink</button>
                  </td>
                </tr>
              </tbody>
            </table>
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

    <!-- Link Monsters Modal -->
    <BaseModal
      :isOpen="showLinkModal"
      title="Link Monsters"
      :showCancel="true"
      :showSubmit="false"
      cancelLabel="Close"
      @cancel="showLinkModal = false"
    >
      <div v-if="allMonsters.length === 0" class="empty-state">
        <p>No monsters available</p>
      </div>
      <div v-else class="monsters-grid">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>CR</th>
              <th>Linked</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="monster in allMonsters" :key="monster.id">
              <td>{{ monster.name }}</td>
              <td>{{ monster.type }}</td>
              <td>{{ monster.challengeRating }}</td>
              <td>
                <ToggleSwitch
                  v-model="linkedMonsters[monster.id]"
                  @update:modelValue="(value) => handleToggleMonster(monster, value)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseModal>
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.section-header h2 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.description,
.notes {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.monsters-grid {
  overflow-x: auto;
}

.monsters-grid table {
  width: 100%;
  border-collapse: collapse;
}

.monsters-grid th,
.monsters-grid td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.monsters-grid th {
  background: var(--color-background);
  font-weight: 600;
  color: var(--color-text);
}

.monsters-grid td {
  color: var(--color-text-light);
}

.unlink-btn {
  background: var(--color-danger);
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.8rem;
}

.unlink-btn:hover {
  background: var(--color-danger-dark);
}

.empty-state {
  color: var(--color-text-light);
  text-align: center;
  padding: 2rem;
  font-style: italic;
}

.link-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.8rem;
}

.link-btn:hover {
  background: var(--color-primary-dark);
}
</style>
