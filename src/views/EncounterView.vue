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
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import Button from '@/components/common/Button.vue';
import PartySelector from '@/components/PartySelector.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import { IconSwords } from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();
const combatStore = useCombatStore();
const partyStore = usePartyStore();
const mentionsStore = useMentionsStore();

const isEditorOpen = ref(false);
const showLinkModal = ref(false);
const showPartySelector = ref(false);
const activeTab = ref('information');
const localMonsters = ref<Record<string, number>>({});

const isQuantityModalOpen = ref(false);
const editingMonster = ref<Monster | null>(null);
const newQuantity = ref(1);

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
], updateEncounterFromStore, { immediate: true, deep: true });

watch(showLinkModal, (isOpen) => {
  if (isOpen && encounter.value) {
    localMonsters.value = JSON.parse(JSON.stringify(encounter.value.monsters || {}));
  }
});

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

const handleMonsterQuantityChange = (monsterId: string, count: number) => {
  if (!encounter.value) return;
  const newCount = Math.max(1, count || 1);
  const monsters = { ...encounter.value.monsters };
  if (monsters[monsterId] !== undefined) {
    monsters[monsterId] = newCount;
    encounterStore.update(encounter.value.id, { monsters });
  }
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

const handleModalToggleMonster = (monsterId: string, isLinked: boolean) => {
  const current = { ...localMonsters.value };
  if (isLinked) {
    if (current[monsterId] === undefined) {
      current[monsterId] = 1;
    }
  } else {
    delete current[monsterId];
  }
  localMonsters.value = current;
};

const handleModalQuantityChange = (monsterId: string, count: number) => {
  if (localMonsters.value[monsterId] === undefined) return;
  const newCount = Math.max(1, count || 1);
  localMonsters.value[monsterId] = newCount;
};

const handleSaveMonsterLinks = async () => {
  if (!encounter.value) return;
  await encounterStore.update(encounter.value.id, { monsters: localMonsters.value });
  showLinkModal.value = false;
};

const openQuantityModal = (monster: Monster) => {
  editingMonster.value = monster;
  newQuantity.value = encounter.value?.monsters?.[monster.id] || 1;
  isQuantityModalOpen.value = true;
};

const handleSaveQuantity = async () => {
  if (!encounter.value || !editingMonster.value) return;

  const monsters = { ...encounter.value.monsters };
  monsters[editingMonster.value.id] = newQuantity.value;

  await encounterStore.update(encounter.value.id, { monsters });
  isQuantityModalOpen.value = false;
};

onMounted(async () => {
  await Promise.all([
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
    <BaseEntityTabView
      :entity="encounter"
      entity-name="encounters.title"
      list-route="/encounters"
      :on-delete="handleDelete"
      :on-edit="handleEdit"
      :is-editing="isEditorOpen"
      :title="encounterTitle"
      :not-found="notFound"
      :loading="loading"
      :tabs="tabs"
      v-model="activeTab"
    >
      <template #sub>
        <div v-if="encounter?.moduleId" class="module-link">
          <router-link :to="`/modules/${encounter.moduleId}`">
            {{ getModuleName(encounter.moduleId) }}
          </router-link>
        </div>
      </template>
      <template #actions>
        <Button v-if="encounter" @click="handleRunCombat" variant="success" :title="t('common.runCombat')">
          <IconSwords />
        </Button>
      </template>
      <template #information>
        <section class="details-section">
          <h2>{{ $t('common.details') }}</h2>
          <div v-html="encounter?.description"></div>
        </section>
      </template>
      <template #monsters>
        <div class="section-header">
          <h2>{{ $t('encounters.monsters.title') }}</h2>
          <Button @click="showLinkModal = true">{{ $t('encounters.monsters.linkAction') }}</Button>
        </div>
        <div v-if="encounterMonsters.length === 0" class="empty-state">
          <p>{{ $t('encounters.monsters.none') }}</p>
        </div>
        <div v-else class="monsters-grid">
          <table>
            <thead>
              <tr>
                <th>{{ t('monsters.name') }}</th>
                <th>{{ t('common.quantity') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="monster in encounterMonsters" :key="monster.id">
                <td>
                  <router-link :to="`/monsters/${monster.id}`">
                    {{ monster.name }}
                  </router-link>
                </td>
                <td>
                  <Button variant="secondary" @click="openQuantityModal(monster)">
                    {{ encounter?.monsters[monster.id] }}
                  </Button>
                </td>
                <td>
                  <button class="unlink-btn" @click="handleToggleMonster(monster, false)">
                    {{ t('common.unlink') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #combats>
        <h2>{{ $t('encounters.combats.title') }}</h2>
        <div v-if="encounterCombats.length > 0" class="combats-grid">
          <table>
            <thead>
              <tr>
                <th>{{ $t('encounters.combats.party') }}</th>
                <th>{{ $t('encounters.combats.created') }}</th>
                <th>{{ $t('encounters.combats.status') }}</th>
                <th>{{ $t('encounters.combats.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="combat in encounterCombats" :key="combat.id">
                <td>{{ getPartyName(combat.partyId) }}</td>
                <td>{{ formatDate(combat.createdAt) }}</td>
                <td>
                  <span :class="['status-badge', getStatusBadgeClass(combat.status)]">
                    {{ $t(`combats.status.${combat.status}`) }}
                  </span>
                </td>
                <td>
                  <Button size="small" variant="primary" @click="handleViewCombat(combat)">
                    {{ $t('encounters.combats.view') }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>{{ $t('encounters.combats.none') }}</p>
      </template>
      <template #editor>
        <EncounterEditor
          :isOpen="isEditorOpen"
          :encounter="encounter"
          @submit="handleSave"
          @cancel="handleCancel"
        />
      </template>
      <template #sidepanel>
        <Mentions :title="t('common.mentions')" :entities="mentions" />
        <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
      </template>
    </BaseEntityTabView>

    <!-- Modals -->
    <BaseModal
      :is-open="isQuantityModalOpen"
      @cancel="isQuantityModalOpen = false"
      @submit="handleSaveQuantity"
      :title="$t('encounters.monsters.setQuantity')"
      modal-id="quantity-modal"
      :show-submit="true"
      :show-cancel="true"
      :submit-label="$t('common.save')"
      :cancel-label="$t('common.cancel')"
    >
      <div class="quantity-modal-content">
        <p v-if="editingMonster">
          {{ $t('encounters.monsters.setQuantityFor', { monsterName: editingMonster.name }) }}
        </p>
        <input
          type="number"
          v-model.number="newQuantity"
          class="count-input"
          min="1"
        />
      </div>
    </BaseModal>

    <BaseModal
      :is-open="showLinkModal"
      @cancel="showLinkModal = false"
      @submit="handleSaveMonsterLinks"
      :title="$t('encounters.monsters.linkModalTitle')"
      modal-id="monster-linking-modal"
      :show-cancel="true"
      :show-submit="true"
      :cancel-label="$t('common.cancel')"
      :submit-label="$t('common.save')"
    >
      <div v-if="allMonsters.length === 0" class="empty-state">
        <p>{{ $t('encounters.monsters.noneAvailable') }}</p>
      </div>
      <div v-else class="monsters-grid">
        <table>
          <thead>
            <tr>
              <th>{{ t('monsters.name') }}</th>
              <th>{{ t('common.quantity') }}</th>
              <th>{{ t('common.linked') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="monster in allMonsters" :key="monster.id">
              <td>{{ monster.name }}</td>
              <td>
                <input
                  v-if="localMonsters[monster.id] !== undefined"
                  type="number"
                  class="count-input"
                  :value="localMonsters[monster.id] || 1"
                  @change="handleModalQuantityChange(monster.id, parseInt(($event.target as HTMLInputElement).value))"
                  min="1"
                />
              </td>
              <td>
                <ToggleSwitch
                  :model-value="localMonsters[monster.id] !== undefined"
                  @update:model-value="handleModalToggleMonster(monster.id, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
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
  color: var(--color-text-inverse);
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
  color: var(--color-text-inverse);
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
  color: var(--color-text-inverse);
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
  color: var(--color-text-inverse);
}

.status-active {
  background: var(--color-success);
  color: var(--color-text-inverse);
}

.status-completed {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.status-unknown {
  background: var(--color-text-light);
  color: var(--color-text-inverse);
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

.monster-linking-modal-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  margin-right: -0.5rem;
}

.monster-link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s;
}

.monster-link-item:hover {
  background-color: var(--color-background);
}

.quantity-modal-content {
  padding: 1rem;
}

.quantity-modal-content p {
  margin-bottom: 1rem;
}
</style>
