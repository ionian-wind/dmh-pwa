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
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/stores/createIndexationStore';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();
const combatStore = useCombatStore();
const partyStore = usePartyStore();

const encounter = ref<Encounter | null>(null);
const isEditorOpen = ref(false);
const showLinkModal = ref(false);
const showPartySelector = ref(false);
const notFound = ref(false);
const activeTab = ref('information');

const mentionsStore = useMentionsStore();

function updateEncounterFromStore() {
  const encounterId = route.params.id as string;
  const found = encounterStore.getEncounterById(encounterId);
  encounter.value = found;
  notFound.value = !found;
}

// Watch for both route changes and encounters changes
watch([
  () => route.params.id,
  () => encounterStore.encounters
], updateEncounterFromStore, { immediate: true });

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
  if (!moduleId) return t('common.noModule');
  const module = moduleStore.modules.find(m => m.id === moduleId);
  return module ? module.name : t('common.unknownModule');
};

// Computed properties for monster linking
const allMonsters = computed(() => monsterStore.filteredMonsters);
const encounterMonsters = computed(() => {
  if (!encounter.value || !encounter.value.monsters) return [];
  return allMonsters.value.filter(monster => 
    Object.keys(encounter.value!.monsters).includes(monster.id)
  );
});

// Monster count tracking - sync with store
const getMonsterCount = (monsterId: string) => {
  if (!encounter.value) return 1;
  return encounterStore.getMonsterCount(encounter.value.id, monsterId) || 1;
};

const setMonsterCount = (monsterId: string, count: number) => {
  if (!encounter.value) return;
  if (count < 1) count = 1;
  if (count > 20) count = 20; // Reasonable limit
  encounterStore.setMonsterCount(encounter.value.id, monsterId, count);
  // Force a reactive update by reassigning the encounter
  encounter.value = encounterStore.getEncounterById(encounter.value.id);
};

const incrementMonsterCount = (monsterId: string) => {
  const currentCount = getMonsterCount(monsterId);
  setMonsterCount(monsterId, currentCount + 1);
};

const decrementMonsterCount = (monsterId: string) => {
  const currentCount = getMonsterCount(monsterId);
  setMonsterCount(monsterId, currentCount - 1);
};

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
  if (isLinked) {
    encounterStore.addMonster(encounter.value.id, monster.id, 1);
  } else {
    encounterStore.removeMonster(encounter.value.id, monster.id);
  }
  // Force a reactive update by reassigning the encounter
  encounter.value = encounterStore.getEncounterById(encounter.value.id);
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

// Computed property for combats associated with this encounter
const encounterCombats = computed(() => {
  if (!encounter.value) return [];
  return combatStore.combats.filter(combat => combat.encounterId === encounter.value!.id);
});

const getPartyName = (partyId: string) => {
  const party = partyStore.getPartyById(partyId);
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
</script>

<template>
  <div class="encounter-view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
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
          <TabGroup
            v-model="activeTab"
            :tabs="tabs"
            variant="default"
            size="md"
          >
            <!-- Information Tab -->
            <template v-if="activeTab === 'information'">
              <div class="tab-content-section">
                <div class="content-section">
                  <h2>{{ t('common.description') }}</h2>
                  <p class="description">{{ encounter.description || t('common.noDescription') }}</p>
                </div>
                <div class="content-section">
                  <h2>{{ t('common.statistics') }}</h2>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">{{ t('encounters.fields.level') }}:</span>
                      <span class="stat-value">{{ encounter.level }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('encounters.fields.difficulty') }}:</span>
                      <span class="stat-value">{{ encounter.difficulty }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('encounters.fields.xp') }}:</span>
                      <span class="stat-value">{{ encounter.xp }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('encounters.fields.module') }}:</span>
                      <span class="stat-value">{{ getModuleName(encounter.moduleId) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('encounters.fields.monsters') }}:</span>
                      <span class="stat-value">{{ encounterMonsters.length }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ t('combats.title') }}:</span>
                      <span class="stat-value">{{ encounterCombats.length }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="encounter.notes" class="content-section">
                  <h2>{{ t('common.notes') }}</h2>
                  <p class="notes">{{ encounter.notes }}</p>
                </div>
              </div>
            </template>
            <!-- Monsters Tab -->
            <template v-if="activeTab === 'monsters'">
              <div class="tab-content-section">
                <div class="content-section">
                  <div class="section-header">
                    <h2>{{ t('monsters.title') }}</h2>
                    <div class="section-actions">
                      <Button @click="showLinkModal = true" class="link-btn">
                        {{ t('encounters.linkMonsters') }}
                      </Button>
                    </div>
                  </div>
                  <div v-if="encounterMonsters.length === 0" class="empty-state">
                    <p>{{ t('encounters.noMonstersYet') }}</p>
                  </div>
                  <div v-else class="monsters-grid">
                    <table>
                      <thead>
                        <tr>
                          <th>{{ t('monsters.fields.name') }}</th>
                          <th>{{ t('monsters.fields.type') }}</th>
                          <th>{{ t('monsters.fields.challengeRating') }}</th>
                          <th>{{ t('monsters.fields.hitPoints') }}</th>
                          <th>{{ t('monsters.fields.armorClass') }}</th>
                          <th>{{ t('encounters.count') }}</th>
                          <th>{{ t('common.actions') }}</th>
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
                            <div class="count-controls">
                              <Button size="small" variant="secondary" @click="decrementMonsterCount(monster.id)">-</Button>
                              <input 
                                type="number" 
                                :value="getMonsterCount(monster.id)" 
                                @input="(e) => setMonsterCount(monster.id, parseInt((e.target as HTMLInputElement).value) || 1)"
                                min="1" 
                                max="20" 
                                class="count-input"
                              />
                              <Button size="small" variant="secondary" @click="incrementMonsterCount(monster.id)">+</Button>
                            </div>
                          </td>
                          <td>
                            <button class="unlink-btn" @click="handleToggleMonster(monster, false)">{{ t('encounters.unlink') }}</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </template>
            <!-- Combats Tab -->
            <template v-if="activeTab === 'combats'">
              <div class="tab-content-section">
                <div class="content-section">
                  <div class="section-header">
                    <h2>{{ t('combats.title') }}</h2>
                    <div class="section-actions">
                      <Button size="small" variant="success" @click="handleRunCombat" :title="t('encounters.runCombat')">⚔️</Button>
                    </div>
                  </div>
                  <div v-if="encounterCombats.length === 0" class="empty-state">
                    <p>{{ t('encounters.noCombatsYet') }}</p>
                  </div>
                  <div v-else class="combats-grid">
                    <table>
                      <thead>
                        <tr>
                          <th>{{ t('combats.fields.party') }}</th>
                          <th>{{ t('combats.fields.status') }}</th>
                          <th>{{ t('combats.fields.round') }}</th>
                          <th>{{ t('combats.fields.turn') }}</th>
                          <th>{{ t('combats.fields.combatants') }}</th>
                          <th>{{ t('common.created') }}</th>
                          <th>{{ t('common.actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="combat in encounterCombats" :key="combat.id">
                          <td>{{ getPartyName(combat.partyId) }}</td>
                          <td>
                            <span class="status-badge" :class="getStatusBadgeClass(combat.status)">
                              {{ t(`combats.status.${combat.status}`) }}
                            </span>
                          </td>
                          <td>{{ combat.currentRound }}</td>
                          <td>{{ combat.currentTurn + 1 }} of {{ combat.combatants.length }}</td>
                          <td>{{ combat.combatants.length }}</td>
                          <td>{{ formatDate(combat.createdAt) }}</td>
                          <td>
                            <Button size="small" variant="primary" @click="handleViewCombat(combat)">
                              {{ t('app.view') }}
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </template>
          </TabGroup>
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
    <aside v-if="!notFound" style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentions" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
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
    <!-- Party Selector Modal -->
    <PartySelector
      :is-open="showPartySelector"
      :encounter="encounter"
      @cancel="handlePartySelectorCancel"
      @combat-created="handleCombatCreated"
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
