<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useEncounterStore } from '@/stores/encounters';
import { useCombatStore } from '@/stores/combats';
import { usePartyStore } from '@/stores/parties';
import type { Encounter, Combat } from '@/types';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import type { MapEntityRef } from '@/maps/types';
import Button from '@/components/form/Button.vue';
import PartySelector from '@/encounters/PartySelector.vue';
import { IconAffiliate, IconInfoCircle, IconSwords } from '@tabler/icons-vue';
import EncounterViewSidebar from '@/encounters/EncounterViewSidebar.vue';
import { alert, confirm } from '@/dialogs';
import { useRightDrawer } from '@/composables/useLayout';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const relations = useEntityLinkRelations();
const encounterStore = useEncounterStore();
const combatStore = useCombatStore();
const partyStore = usePartyStore();

const showPartySelector = ref(false);
const activeTab = ref('information');
const validationError = ref<string | null>(null);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

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

const handleDelete = async () => {
  if (!encounter.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: encounter.value.name })))
  ) {
    return false;
  }
  discardDraft();
  await encounterStore.remove(encounter.value.id);
  return true;
};

async function handleDeleteFromSidebar() {
  if (await handleDelete()) await router.push('/encounters');
}

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

async function setEncounterLinks(links: MapEntityRef[]) {
  if (!encounter.value) return;
  await relations.setLinkedIds(
    'encounter',
    encounter.value.id,
    'note',
    links.filter((link) => link.kind === 'note').map((link) => link.id),
  );
}

const editorTabs = useEntityEditorTabs();

const draftName = computed({
  get: () => editState.draft?.name ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.name = value;
  },
});

const draftDescription = computed({
  get: () => editState.draft?.description ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.description = value;
  },
});

async function prepareDraft(draft: Encounter): Promise<boolean> {
  if (markdownEditorRef.value?.getMarkdown) {
    draft.description = markdownEditorRef.value.getMarkdown();
  }
  if (!draft.name?.trim()) {
    activeTab.value = 'main';
    await alert(t('common.nameRequired'));
    return false;
  }
  validationError.value = null;
  return true;
}

async function persistDraft(draft: Encounter): Promise<boolean> {
  if (!encounter.value) return false;
  try {
    await encounterStore.update(encounter.value.id, {
      name: draft.name,
      description: draft.description,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  updateEncounterFromStore();
  return true;
}

function handleDescriptionChange(description: string) {
  if (!encounter.value) return;
  void encounterStore.update(encounter.value.id, { description });
}

const { editState, setEditMode, discardDraft } = useEntityEditMode<Encounter>({
  source: encounter,
  clone: (source) => ({ ...source, pawns: { ...source.pawns } }),
  isDirty: (draft, source) =>
    draft.name !== source.name ||
    (draft.description ?? '') !== (source.description ?? ''),
  onEnter: () => {
    validationError.value = null;
  },
  onDiscard: () => {
    validationError.value = null;
  },
  prepare: prepareDraft,
  save: persistDraft,
});

const viewTabs = computed(() => [
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

const tabs = computed(() =>
  editState.isEditMode
    ? editorTabs.value.map((tab) => ({
        id: tab.name,
        label: tab.title,
        icon: tab.icon,
      }))
    : viewTabs.value,
);

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
    props: {
      encounter,
      editState,
      onSetEditMode: setEditMode,
      onRunCombat: handleRunCombat,
      onDelete: handleDeleteFromSidebar,
    },
  });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
});
</script>

<template>
  <div>
    <BaseEntityTabView
      :entity="encounter"
      entity-name="encounters.title"
      list-route="/encounters"
      :on-delete="handleDelete"
      :header-show-edit="false"
      :header-show-delete="false"
      :is-editing="editState.isEditMode"
      :title="editState.isEditMode ? '' : encounterTitle"
      :not-found="notFound"
      :loading="loading"
      :tabs="tabs"
      v-model="activeTab"
    >
      <template #main>
        <EntityInlineEditor
          v-model:title="draftName"
          :title-placeholder="t('encounters.fields.name')"
          :validation-error="validationError"
        >
          <EntityMarkdownEditor
            ref="markdownEditorRef"
            v-model="draftDescription"
            :is-visual-mode="editState.isVisualMode"
            :entity-id="editState.draft?.id || ''"
            entity-type="encounter"
            :placeholder="t('encounters.fields.description')"
          />
        </EntityInlineEditor>
      </template>
      <template #information>
        <EntityContentSurface v-if="!editState.isEditMode">
          <MilkdownView
            :task-checkbox-enabled="true"
            :enable-mention-modal="true"
            :content="encounter?.description || ''"
            @update:content="handleDescriptionChange"
          />
        </EntityContentSurface>
      </template>
      <template #links>
        <EntityViewLinks v-if="!editState.isEditMode" :links="encounterLinks" />
        <EntitiesLinking
          v-else
          kind="note"
          :model-value="encounterLinks"
          @update:model-value="setEncounterLinks"
        />
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
