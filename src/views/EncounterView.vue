<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useEncounterStore } from '@/stores/encounters';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import { useCombatStore } from '@/stores/combats';
import { usePartyStore } from '@/stores/parties';
import type { Encounter, Monster, Combat } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import Button from '@/components/common/Button.vue';
import PartySelector from '@/components/PartySelector.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import TabPanel from '@/components/common/TabPanel.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();
const combatStore = useCombatStore();
const partyStore = usePartyStore();

const isEditorOpen = ref(false);
const showLinkModal = ref(false);
const showPartySelector = ref(false);
const activeTab = ref('information');

const mentionsStore = useMentionsStore();

const encounter = ref<Encounter | null>(null);
const loading = computed(() => !encounterStore.isLoaded);
const notFound = computed(() => encounterStore.isLoaded && !encounter.value);

function updateEncounterFromStore() {
  if (!encounterStore.isLoaded) {
    return;
  }
  const found = encounterStore.getById(route.params.id as string);
  if (found) {
    encounter.value = found;
  } else {
    router.push('/encounters');
  }
}

watch([
  () => encounterStore.items,
  () => encounterStore.isLoaded
], updateEncounterFromStore, { immediate: true });

const handleEdit = () => {
  isEditorOpen.value = true;
};

const handleDelete = async () => {
  if (!encounter.value) return;
  await encounterStore.remove(encounter.value.id);
  await router.push('/encounters');
};

const handleSave = async (updatedEncounter: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!encounter.value) return;
  await encounterStore.update(encounter.value.id, updatedEncounter);
  isEditorOpen.value = false;
};

const handleCancel = () => {
  isEditorOpen.value = false;
};

const getModuleName = (moduleId: string | null) => {
  if (!moduleId) return 'No Module';
  const module = moduleStore.items.find(m => m.id === moduleId);
  return module ? module.name : 'Unknown Module';
};

// Computed properties for monster linking
const allMonsters = computed(() => monsterStore.filtered);
const encounterMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return [];
  return allMonsters.value.filter(monster => 
    Object.keys(encounter.value!.monsters).includes(monster.id)
  );
});

const availableMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return allMonsters.value;
  return allMonsters.value.filter(monster => 
    !Object.keys(encounter.value!.monsters).includes(monster.id)
  );
});

// Reactive linked monsters state
const linkedMonsters = ref<Record<string, boolean>>({});

// Update linked monsters when encounter changes
watch(() => encounter.value?.monsters, (newMonsters) => {
  if (!newMonsters) {
    linkedMonsters.value = {};
    return;
  }
  
  const linked = Object.keys(newMonsters);
  linkedMonsters.value = allMonsters.value.reduce((acc, monster) => {
    acc[monster.id] = linked.includes(monster.id);
    return acc;
  }, {} as Record<string, boolean>);
}, { immediate: true });

// Update linked monsters when allMonsters changes
watch(allMonsters, (newMonsters) => {
  if (!encounter.value?.monsters) {
    linkedMonsters.value = {};
    return;
  }
  
  const linked = Object.keys(encounter.value.monsters);
  linkedMonsters.value = newMonsters.reduce((acc, monster) => {
    acc[monster.id] = linked.includes(monster.id);
    return acc;
  }, {} as Record<string, boolean>);
}, { immediate: true });

const handleToggleMonster = (monster: Monster, isLinked: boolean) => {
  if (!encounter.value) return;
  const monsters = encounter.value.monsters || {};
  if (isLinked) {
    monsters[monster.id] = 1;
  } else {
    delete monsters[monster.id];
  }
  encounterStore.update(encounter.value.id, { monsters });
  // Force a reactive update by reassigning the encounter
  encounter.value = encounterStore.getById(encounter.value.id);
};

const isMonsterLinked = (monsterId: string) => {
  return linkedMonsters.value[monsterId];
};

const handleRunCombat = () => {
  showPartySelector.value = true;
};

const handleCombatCreated = (combat: Combat) => {
  showPartySelector.value = false;
  // Navigate to the combat view
  router.push(`/combats/${combat.id}`);
};

const handlePartySelectorCancel = () => {
  showPartySelector.value = false;
};

// Computed properties for BaseEntityView
const encounterTitle = computed(() => encounter.value?.name || '');

// Computed property for combats associated with this encounter
const encounterCombats = computed(() => {
  if (!encounter.value) return [];
  return combatStore.items.filter(combat => combat.encounterId === encounter.value!.id);
});

const getPartyName = (partyId: string) => {
  const party = partyStore.getById(partyId);
  return party ? party.name : t('common.unknownParty');
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString();
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'preparing': return 'status-preparing';
    case 'active': return 'status-active';
    case 'completed': return 'status-completed';
    default: return 'status-unknown';
  }
};

const handleViewCombat = (combat: Combat) => {
  router.push(`/combats/${combat.id}`);
};

// Tab configuration
const tabs = computed(() => [
  {
    id: 'information',
    label: t('encounters.tabs.information'),
    icon: '📋',
    badge: undefined
  },
  {
    id: 'monsters',
    label: t('encounters.tabs.monsters'),
    icon: '👹',
    badge: encounterMonsters.value.length
  },
  {
    id: 'combats',
    label: t('encounters.tabs.combats'),
    icon: '⚔️',
    badge: encounterCombats.value.length
  }
]);

const mentions = computed(() => {
  if (!encounter.value) return [];
  return mentionsStore.getLinks({ kind: 'encounter', id: encounter.value.id });
});
const mentionedInEntities = computed(() => {
  if (!encounter.value) return [];
  return mentionsStore.getBacklinks({ kind: 'encounter', id: encounter.value.id });
});

onMounted(() => {
  Promise.all([
    encounterStore.load(),
    monsterStore.load(),
    moduleStore.load(),
    combatStore.load(),
    partyStore.load(),
    mentionsStore.load(),
  ]);
});
</script>

<template>
  <div>
    <BaseEntityView
      :entity="encounter"
      entity-name="Encounter"
      list-route="/encounters"
      :on-delete="handleDelete"
      :on-edit="handleEdit"
      :is-editing="isEditorOpen"
      :title="encounterTitle"
      :not-found="notFound"
      :loading="loading"
    >
      <template #sub>
        <div v-if="encounter?.moduleId" class="module-link">
          <router-link :to="`/modules/${encounter.moduleId}`">
            {{ getModuleName(encounter.moduleId) }}
          </router-link>
        </div>
      </template>
      
      <template #actions>
        <Button v-if="encounter" @click="handleRunCombat" variant="primary" title="Run Combat">
          <i class="si si-d20"></i>
        </Button>
      </template>
      
      <div class="encounter-content">
        <TabGroup :tabs="tabs" v-model="activeTab" />

        <div class="tab-content">
          <TabPanel tab-id="information">
            <section class="details-section">
              <h2>{{ $t('common.details') }}</h2>
              <div v-html="encounter?.description"></div>
            </section>
          </TabPanel>

          <TabPanel tab-id="monsters">
            <div class="monster-list-controls">
              <h2>{{ $t('encounters.monsters.title') }}</h2>
              <Button @click="showLinkModal = true">{{ $t('encounters.monsters.linkAction') }}</Button>
            </div>
            <div v-if="encounterMonsters.length" class="monster-grid">
              <div v-for="monster in encounterMonsters" :key="monster.id" class="monster-card-item">
                <router-link :to="`/monsters/${monster.id}`" class="monster-link">
                  <div class="monster-name">{{ monster.name }}</div>
                  <div class="monster-quantity">
                    x {{ encounter?.monsters[monster.id] }}
                  </div>
                </router-link>
              </div>
            </div>
            <p v-else>{{ $t('encounters.monsters.none') }}</p>
          </TabPanel>

          <TabPanel tab-id="combats">
            <h2>{{ $t('encounters.combats.title') }}</h2>
            <div v-if="encounterCombats.length > 0" class="combat-list">
              <div
                v-for="combat in encounterCombats"
                :key="combat.id"
                class="combat-list-item"
                @click="handleViewCombat(combat)"
              >
                <div class="combat-info">
                  <span>{{ getPartyName(combat.partyId) }}</span>
                  <span>{{ formatDate(combat.createdAt) }}</span>
                </div>
                <span :class="['status-badge', getStatusBadgeClass(combat.status)]">
                  {{ $t(`combats.status.${combat.status}`) }}
                </span>
              </div>
            </div>
            <p v-else>{{ $t('encounters.combats.none') }}</p>
          </TabPanel>
        </div>
      </div>

      <!-- Editor Modal -->
      <template #editor>
        <EncounterEditor
          :isOpen="isEditorOpen"
          :encounter="encounter"
          @submit="handleSave"
          @cancel="handleCancel"
        />
      </template>

      <template #sidepanel>
        <Mentions title="Mentions" :entities="mentions" />
        <Mentions title="Mentioned In" :entities="mentionedInEntities" />
      </template>
    </BaseEntityView>

    <!-- Modals -->
    <BaseModal :is-open="showLinkModal" @close="showLinkModal = false" :title="$t('encounters.monsters.linkModalTitle')" modal-id="monster-linking-modal">
      <div class="monster-linking-modal">
        <div v-for="monster in allMonsters" :key="monster.id" class="monster-link-item">
          <ToggleSwitch
            :model-value="isMonsterLinked(monster.id)"
            @update:model-value="handleToggleMonster(monster, $event)"
            :label="monster.name"
          />
        </div>
      </div>
    </BaseModal>

    <PartySelector
      :is-open="showPartySelector"
      :encounter="encounter"
      @combat-created="handleCombatCreated"
      @cancel="handlePartySelectorCancel"
    />
  </div>
</template>

<style scoped>
.encounter-content {
  display: grid;
  gap: 2rem;
}

.tab-content-section {
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

.section-actions {
  display: flex;
  gap: 0.5rem;
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

.run-combat-btn {
  background: var(--color-success);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.8rem;
}

.run-combat-btn:hover {
  background: var(--color-success-dark);
}

.count-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.count-input {
  width: 4rem;
  text-align: center;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-background);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  font-size: 0.9rem;
}

.count-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-alpha);
}

.combats-grid {
  overflow-x: auto;
}

.combats-grid table {
  width: 100%;
  border-collapse: collapse;
}

.combats-grid th,
.combats-grid td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.combats-grid th {
  background: var(--color-background);
  font-weight: 600;
  color: var(--color-text);
}

.combats-grid td {
  color: var(--color-text-light);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-preparing {
  background: var(--color-warning);
  color: white;
}

.status-active {
  background: var(--color-success);
  color: white;
}

.status-completed {
  background: var(--color-primary);
  color: white;
}

.status-unknown {
  background: var(--color-text-light);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

.stat-label {
  font-weight: 600;
  color: var(--color-text);
}

.stat-value {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
