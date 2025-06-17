<template>
  <div v-if="module" class="module-view">
    <div class="view-header">
      <div class="header-content">
        <h1>{{ module.name }}</h1>
        <p class="module-description">{{ module.description }}</p>
      </div>
      <div class="header-actions">
        <button @click="showEditor = true" class="edit-btn">Edit Module</button>
        <button @click="deleteModule" class="delete-btn">Delete Module</button>
      </div>
    </div>

    <div class="module-content">
      <section class="content-section">
        <h2>Parties</h2>
        <div v-if="moduleParties.length === 0" class="empty-state">
          <p>No parties in this module</p>
        </div>
        <div v-else class="content-grid">
          <div v-for="party in moduleParties" :key="party.id" class="content-card">
            <h3>{{ party.name }}</h3>
            <p>{{ party.description }}</p>
          </div>
        </div>
      </section>

      <section class="content-section">
        <h2>Monsters</h2>
        <div v-if="moduleMonsters.length === 0" class="empty-state">
          <p>No monsters in this module</p>
        </div>
        <div v-else class="content-grid">
          <div v-for="monster in moduleMonsters" :key="monster.id" class="content-card">
            <h3>{{ monster.name }}</h3>
            <p>{{ monster.type }}</p>
          </div>
        </div>
      </section>

      <section class="content-section">
        <h2>Encounters</h2>
        <div v-if="moduleEncounters.length === 0" class="empty-state">
          <p>No encounters in this module</p>
        </div>
        <div v-else class="content-grid">
          <div v-for="encounter in moduleEncounters" :key="encounter.id" class="content-card">
            <h3>{{ encounter.name }}</h3>
            <p>{{ encounter.description }}</p>
          </div>
        </div>
      </section>

      <section class="content-section">
        <h2>Notes</h2>
        <div v-if="moduleNotes.length === 0" class="empty-state">
          <p>No notes in this module</p>
        </div>
        <div v-else class="content-grid">
          <div v-for="note in moduleNotes" :key="note.id" class="content-card">
            <h3>{{ note.title }}</h3>
            <p>{{ note.content }}</p>
          </div>
        </div>
      </section>
    </div>

    <ModuleEditor
      v-if="showEditor"
      :module="module"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useNoteStore } from '@/stores/notes';
import type { Module } from '@/types';
import ModuleEditor from '@/components/ModuleEditor.vue';

const route = useRoute();
const router = useRouter();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const noteStore = useNoteStore();

const showEditor = ref(false);
const module = ref<Module | null>(null);

const moduleParties = computed(() => 
  partyStore.parties.filter(party => party.moduleId === route.params.id)
);

const moduleMonsters = computed(() => 
  monsterStore.monsters.filter(monster => monster.moduleId === route.params.id)
);

const moduleEncounters = computed(() => 
  encounterStore.encounters.filter(encounter => encounter.moduleId === route.params.id)
);

const moduleNotes = computed(() => 
  noteStore.notes.filter(note => note.moduleId === route.params.id)
);

onMounted(async () => {
  const moduleId = route.params.id as string;
  await Promise.all([
    moduleStore.loadModules(),
    partyStore.loadParties(),
    monsterStore.loadMonsters(),
    encounterStore.loadEncounters(),
    noteStore.loadNotes()
  ]);
  
  module.value = moduleStore.getModuleById(moduleId);
  if (!module.value) {
    router.push('/modules');
  }
});

const handleSubmit = async (updatedModule: Module) => {
  await moduleStore.updateModule(updatedModule);
  module.value = updatedModule;
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteModule = async () => {
  if (!module.value) return;
  
  if (confirm(`Are you sure you want to delete the module "${module.value.name}"? This will also remove all associated content.`)) {
    await moduleStore.deleteModule(module.value.id);
    router.push('/modules');
  }
};
</script>

<style scoped>
.module-view {
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

.module-description {
  color: var(--color-text-light);
  margin: 0;
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

.module-content {
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

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.content-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.content-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.content-card p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}
</style> 