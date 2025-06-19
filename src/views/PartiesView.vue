<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { Party } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';
import PartyCard from '@/components/PartyCard.vue';
import Button from '@/components/common/Button.vue';

const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const showEditor = ref(false);
const editingParty = ref<Party | null>(null);

onMounted(async () => {
  await partyStore.load();
});

const handleCreateClick = () => {
  editingParty.value = null;
  showEditor.value = true;
};

const handleEditClick = (party: Party) => {
  editingParty.value = party;
  showEditor.value = true;
};

const handleSave = async (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (editingParty.value?.id) {
    await partyStore.update(editingParty.value.id, party);
  } else {
    await partyStore.create(party);
  }
  showEditor.value = false;
  editingParty.value = {
    id: '',
    name: '',
    description: '',
    characters: [],
    notes: '',
    moduleIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteParty = async (party: Party) => {
  if (confirm(`Are you sure you want to delete ${party.name}?`)) {
    await partyStore.remove(party.id);
  }
};
</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick">+</Button>
    </div>

    <div v-if="partyStore.filtered.length === 0" class="view-empty">
      <p v-if="!['any', 'none', null].includes(moduleStore.currentModuleFilter)">Try changing the module filter or create a new note.</p>
      <p v-else>No parties yet. Create your first party to get started!</p>
    </div>

    <div class="parties-grid">
      <PartyCard
        v-for="party in partyStore.filtered"
        :key="party.id"
        :party="party"
        @view="() => router.push(`/parties/${party.id}`)"
        @edit="() => { editingParty = party; showEditor = true; }"
        @delete="deleteParty"
      />
    </div>

    <PartyEditor
      v-if="showEditor"
      :party="editingParty"
      :is-open="showEditor"
      @submit="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>

