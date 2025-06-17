<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { Party } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();

const showEditor = ref(false);
const party = ref<Party | null>(null);

const module = computed(() => {
  if (!party.value) return null;
  return moduleStore.getModuleById(party.value.moduleId);
});

onMounted(async () => {
  const partyId = route.params.id as string;
  await Promise.all([
    partyStore.loadParties(),
    moduleStore.loadModules()
  ]);
  
  party.value = partyStore.getPartyById(partyId);
  if (!party.value) {
    router.push('/parties');
  }
});

const handleSubmit = async (updatedParty: Party) => {
  await partyStore.updateParty(updatedParty.id, updatedParty);
  party.value = updatedParty;
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteParty = async () => {
  if (!party.value) return;
  
  if (confirm(`Are you sure you want to delete the party "${party.value.name}"?`)) {
    await partyStore.deleteParty(party.value.id);
    router.push('/parties');
  }
};
</script>

<template>
  <div v-if="party" class="party-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ party.name }}</h1>
        <p class="party-description">{{ party.description }}</p>
        <div class="party-meta">
          <span v-if="module" class="module-badge">
            Module: {{ module.name }}
          </span>
          <!--span class="character-count">{{ party.characters.length }} characters</span-->
        </div>
      </div>
      <div class="header-actions">
        <button @click="showEditor = true" class="edit-btn">Edit Party</button>
        <button @click="deleteParty" class="delete-btn">Delete Party</button>
      </div>
    </div>

    <!--div class="party-content">
      <section class="content-section">
        <h2>Characters</h2>
        <div v-if="party.characters.length === 0" class="empty-state">
          <p>No characters in this party yet</p>
        </div>
        <div v-else class="characters-grid">
          <div v-for="character in party.characters" :key="character.id" class="character-card">
            <h3>{{ character.name }}</h3>
            <p>{{ character.race }} {{ character.class }}</p>
            <p>Level {{ character.level }}</p>
          </div>
        </div>
      </section>
    </div-->

    <PartyEditor
      v-if="showEditor"
      :party="party"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.party-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.party-description {
  color: var(--color-text-light);
  margin: 0 0 1rem 0;
}

.party-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.module-badge {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
}

.character-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
}

.edit-btn {
  background: var(--color-primary);
  color: white;
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.edit-btn:hover {
  background: var(--color-primary-dark);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}

.party-content {
  display: flex;
  flex-direction: column;
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
}

.empty-state {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-light);
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.character-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.character-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.character-card p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}
</style>
