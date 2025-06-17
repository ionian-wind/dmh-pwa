<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import type { Party } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';
import PartyCard from '@/components/PartyCard.vue';

const router = useRouter();
const partyStore = usePartyStore();
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

const handleSubmit = async (party: Party) => {
  if (party.id) {
    await partyStore.updateParty(party.id, party);
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
  <div class="parties-view">
    <div class="view-header">
      <h1>Parties</h1>
      <button @click="handleCreateClick" class="create-btn">Create Party</button>
    </div>

    <div v-if="partyStore.parties.length === 0" class="empty-state">
      <p>No parties yet. Create your first party to get started!</p>
    </div>

    <div v-else class="parties-grid">
      <PartyCard
        v-for="party in partyStore.parties"
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

<style scoped>
.parties-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.view-header h1 {
  margin: 0;
  color: var(--color-text);
}

.create-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-light);
}

.parties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.party-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: transform 0.2s;
}

.party-card:hover {
  transform: translateY(-2px);
}

.card-content {
  padding: 1.5rem;
}

.card-content h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.description {
  margin: 0 0 1rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.party-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.character-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.view-btn,
.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.view-btn {
  background: var(--color-primary);
  color: white;
}

.edit-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.view-btn:hover {
  background: var(--color-primary-dark);
}

.edit-btn:hover {
  background: var(--color-background-mute);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}
</style> 
