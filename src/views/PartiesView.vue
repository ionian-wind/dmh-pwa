<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
  await partyStore.loadParties();
});

const handleCreateClick = () => {
  editingParty.value = null;
  showEditor.value = true;
};

const handleEditClick = (party: Party) => {
  editingParty.value = party;
  showEditor.value = true;
};

const handleSubmit = async (party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (editingParty.value?.id) {
    await partyStore.updateParty(editingParty.value.id, party);
  } else {
    await partyStore.createParty(party);
  }
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteParty = async (party: Party) => {
  if (confirm(`Are you sure you want to delete the party "${party.name}"?`)) {
    await partyStore.deleteParty(party.id);
  }
};
</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick">+</Button>
    </div>

    <div v-if="partyStore.filteredParties.length === 0" class="view-empty">
      <p>No parties yet.</p>
      <p v-if="!['any', 'none', null].includes(moduleStore.currentModuleFilter)">Try changing the module filter or create a new note.</p>
    </div>

    <div v-else class="view-grid">
      <PartyCard
        v-for="party in partyStore.filteredParties"
        :key="party.id"
        :party="party"
        @view="() => router.push(`/parties/${party.id}`)"
        @edit="handleEditClick"
        @delete="deleteParty"
      />
    </div>

    <PartyEditor
      v-if="showEditor"
      :party="editingParty"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

