<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePartyStore } from '@/stores/parties';
import { useSelectedParty } from '@/parties/useSelectedParty';
import PartyEditor from '@/parties/PartyEditor.vue';
import SidebarActionItem from '@/components/common/SidebarActionItem.vue';
import { confirm } from '@/dialogs';
import type { Party } from '@/types';
import { IconPencil, IconPlus } from '@tabler/icons-vue';

const { t } = useI18n();
const partyStore = usePartyStore();
const { selectedPartyId, selectParty } = useSelectedParty();

const parties = computed(() => partyStore.sortedItems);
const isEditorOpen = ref(false);
const partyToEdit = ref<Party | null>(null);

function openCreate(): void {
  partyToEdit.value = null;
  isEditorOpen.value = true;
}

function openEdit(party: Party): void {
  partyToEdit.value = party;
  isEditorOpen.value = true;
}

function closeEditor(): void {
  isEditorOpen.value = false;
  partyToEdit.value = null;
}

async function handleSubmit(party: Party): Promise<void> {
  const { name, description, characters } = party;
  if (party.id) {
    await partyStore.update(party.id, { name, description, characters });
  } else {
    await partyStore.create({ name, description, characters });
  }
  closeEditor();
}

async function removeParty(party: Party): Promise<void> {
  if (!(await confirm(t('common.confirmDelete', { title: party.name })))) {
    return;
  }
  if (selectedPartyId.value === party.id) selectParty(null);
  await partyStore.remove(party.id);
}

async function handleDelete(id: string): Promise<void> {
  const party = partyStore.getById(id);
  if (!party) return;
  await removeParty(party);
  closeEditor();
}

onMounted(async () => {
  await partyStore.load();
});
</script>

<template>
  <div class="party-list-container column full-height">
    <div>
      <QList class="q-pa-none q-mb-none">
        <QItem
          clickable
          class="party-all-characters"
          :active="selectedPartyId === null"
          :active-class="'party-item--active'"
          v-ripple
          @click="selectParty(null)"
        >
          <QItemSection>{{ t('characters.all') }}</QItemSection>
        </QItem>
      </QList>
      <QSeparator />
    </div>

    <QScrollArea class="col-grow" style="min-height: 0">
      <QList>
        <SidebarActionItem
          v-for="party in parties"
          :key="party.id"
          :title="party.name"
          :active="selectedPartyId === party.id"
          :removable="true"
          :remove-label="t('common.delete')"
          class="party-item"
          @activate="selectParty(party.id)"
          @remove="removeParty(party)"
        >
          <template #actions>
            <QBtn
              flat
              dense
              size="sm"
              :title="t('common.edit')"
              :aria-label="t('common.edit')"
              @click.stop="openEdit(party)"
            >
              <IconPencil :size="18" />
            </QBtn>
          </template>
        </SidebarActionItem>
      </QList>
    </QScrollArea>

    <QSeparator />
    <QList>
      <QItem clickable v-ripple @click="openCreate">
        <QItemSection>{{ t('parties.createNew') }}</QItemSection>
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
      </QItem>
    </QList>

    <PartyEditor
      :party="partyToEdit"
      :is-open="isEditorOpen"
      @submit="handleSubmit"
      @delete="handleDelete"
      @cancel="closeEditor"
    />
  </div>
</template>

<style scoped>
.party-item--active {
  background: var(--color-selected-surface) !important;
  color: var(--color-text) !important;
  font-weight: 500;
}
</style>
