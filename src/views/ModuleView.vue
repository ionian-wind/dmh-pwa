<template>
  <div class="module-view-container">
    <BaseEntityView
      :entity="module"
      entity-name="Module"
      list-route="/modules"
      :on-delete="handleDelete"
      :on-edit="() => showEditor = true"
      :is-editing="showEditor"
      :title="moduleTitle"
      :subtitle="moduleSubtitle"
      :not-found="notFound"
    >
      <!-- Module Content -->
      <div v-if="module" class="module-content">
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

      <!-- Editor Modal -->
      <template #editor>
        <ModuleEditor
          v-if="showEditor"
          :module="module"
          :is-open="showEditor"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </template>
    </BaseEntityView>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useNoteStore } from '@/stores/notes';
import type { Module } from '@/types';
import ModuleEditor from '@/components/ModuleEditor.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';

const route = useRoute();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const noteStore = useNoteStore();

const showEditor = ref(false);
const module = ref<Module | null>(null);
const notFound = ref(false);

const moduleParties = computed(() => 
  partyStore.parties.filter(party => party.moduleIds?.includes(route.params.id as string))
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
    notFound.value = true;
  }
});

const handleSubmit = async (updatedModule: Omit<Module, 'id'>) => {
  if (!module.value) return;
  await moduleStore.updateModule(module.value.id, updatedModule);
  module.value = moduleStore.getModuleById(module.value.id);
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const handleDelete = async () => {
  if (!module.value) return;
  await moduleStore.deleteModule(module.value.id);
};

// Computed properties for BaseEntityView
const moduleTitle = computed(() => module.value?.name || '');
const moduleSubtitle = computed(() => module.value?.description || '');
</script>

<style scoped>
.module-content {
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
  font-size: 1.1rem;
}

.content-card p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.4;
}

.empty-state {
  color: var(--color-text-light);
  text-align: center;
  padding: 2rem;
  font-style: italic;
}
</style> 
