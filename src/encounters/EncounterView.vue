<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useEncounterStore } from '@/stores/encounters';
import { useCombatStore } from '@/stores/combats';
import { usePartyStore } from '@/stores/parties';
import type { Encounter, Combat } from '@/types';
import EncounterEditor from '@/encounters/EncounterEditor.vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import type { MapEntityRef } from '@/maps/types';
import Button from '@/components/form/Button.vue';
import PartySelector from '@/encounters/PartySelector.vue';
import { IconAffiliate, IconInfoCircle, IconSwords } from '@tabler/icons-vue';
import EncounterViewSidebar from '@/encounters/EncounterViewSidebar.vue';
import { confirm } from '@/dialogs';
import { sanitizeHtmlContent } from '@/utils/markdownParser';
import { useRightDrawer } from '@/composables/useLayout';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const relations = useEntityLinkRelations();
const encounterStore = useEncounterStore();
const combatStore = useCombatStore();
const partyStore = usePartyStore();

const isEditorOpen = ref(false);
const showPartySelector = ref(false);
const activeTab = ref('information');

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

watch(
  [() => encounterStore.items, () => encounterStore.isLoaded],
  updateEncounterFromStore,
  { immediate: true, deep: true },
);

const handleEdit = () => {
  isEditorOpen.value = true;
};

const handleDelete = async () => {
  if (!encounter.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: encounter.value.name })))
  ) {
    return false;
  }
  await encounterStore.remove(encounter.value.id);
  return true;
};

const handleSave = async (
  updatedEncounter: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (!encounter.value) return;
  await encounterStore.update(encounter.value.id, updatedEncounter);
  isEditorOpen.value = false;
};

const handleCancel = () => {
  isEditorOpen.value = false;
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
const safeDescription = computed(() =>
  sanitizeHtmlContent(encounter.value?.description || ''),
);

// Computed property for combats associated with this encounter
const encounterCombats = computed(() => {
  if (!encounter.value) return [];
  return combatStore.items.filter(
    (combat) => combat.encounterId === encounter.value!.id,
  );
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
    case 'preparing':
      return 'status-preparing';
    case 'active':
      return 'status-active';
    case 'completed':
      return 'status-completed';
    default:
      return 'status-unknown';
  }
};

const handleViewCombat = (combat: Combat) => {
  router.push(`/combats/${combat.id}`);
};

// Tab configuration
const encounterLinks = computed<MapEntityRef[]>(() => {
  const id = encounter.value?.id;
  if (!id) return [];
  return relations
    .getLinkedIds('encounter', id, 'note')
    .map((noteId) => ({ kind: 'note' as const, id: noteId }));
});

const tabs = computed(() => [
  {
    id: 'information',
    label: t('encounters.tabs.information'),
    icon: IconInfoCircle,
    badge: undefined,
  },
  {
    id: 'combats',
    label: t('encounters.tabs.combats'),
    icon: IconSwords,
    badge: encounterCombats.value.length,
  },
  {
    id: 'links',
    label: t('common.linkedEntities'),
    icon: IconAffiliate,
    badge: encounterLinks.value.length || undefined,
  },
]);

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    encounterStore.load(),
    combatStore.load(),
    partyStore.load(),
    relations.loadFor('encounter', 'note'),
  ]);

  rightDrawer.set({
    component: EncounterViewSidebar,
    props: { encounter },
  });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
});

async function handleEditorDelete() {
  if (await handleDelete()) {
    isEditorOpen.value = false;
    await router.push('/encounters');
  }
}
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
      :headerButtons="[
        {
          color: 'warning',
          title: 'common.runCombat',
          event: handleRunCombat,
          icon: IconSwords,
        },
      ]"
    >
      <template #information>
        <section class="details-section">
          <div v-html="safeDescription"></div>
        </section>
      </template>
      <template #links>
        <EntityViewLinks :links="encounterLinks" />
      </template>
      <template #combats>
        <h2>{{ t('encounters.combats.title') }}</h2>
        <div v-if="encounterCombats.length > 0" class="combats-grid">
          <table>
            <thead>
              <tr>
                <th>{{ t('encounters.combats.party') }}</th>
                <th>{{ t('encounters.combats.created') }}</th>
                <th>{{ t('encounters.combats.statusTitle') }}</th>
                <th>{{ t('encounters.combats.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="combat in encounterCombats" :key="combat.id">
                <td>{{ getPartyName(combat.partyId) }}</td>
                <td>{{ formatDate(combat.createdAt) }}</td>
                <td>
                  <span
                    :class="[
                      'status-badge',
                      getStatusBadgeClass(combat.status),
                    ]"
                  >
                    {{ t(`encounters.combats.status.${combat.status}`) }}
                  </span>
                </td>
                <td>
                  <Button
                    size="small"
                    variant="primary"
                    @click="handleViewCombat(combat)"
                  >
                    {{ t('encounters.combats.view') }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>{{ t('encounters.combats.none') }}</p>
      </template>
      <template #editor>
        <EncounterEditor
          :isOpen="isEditorOpen"
          :encounter="encounter"
          @submit="handleSave"
          @delete="handleEditorDelete"
          @cancel="handleCancel"
        />
      </template>
    </BaseEntityTabView>

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

.description {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
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
  color: var(--color-accent);
  font-weight: 600;
}

.quantity-modal-content {
  padding: 1rem;
}

.quantity-modal-content p {
  margin-bottom: 1rem;
}
</style>
