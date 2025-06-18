<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter, Combat } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import EncounterCard from '@/components/EncounterCard.vue';
import Button from '@/components/common/Button.vue';
import PartySelector from '@/components/PartySelector.vue';

const router = useRouter();
const encounterStore = useEncounterStore();
const moduleStore = useModuleStore();

const isEditorOpen = ref(false);
const selectedEncounter = ref<Encounter | null>(null);
const showPartySelector = ref(false);
const selectedEncounterForCombat = ref<Encounter | null>(null);

onMounted(async () => {
  await Promise.all([
    encounterStore.loadEncounters(),
    moduleStore.loadModules()
  ]);
});

const handleCreate = () => {
  selectedEncounter.value = null;
  isEditorOpen.value = true;
};

const handleEdit = (encounter: Encounter) => {
  selectedEncounter.value = encounter;
  isEditorOpen.value = true;
};

const handleDelete = async (encounter: Encounter) => {
  if (confirm(`Are you sure you want to delete the encounter "${encounter.name}"?`)) {
    await encounterStore.deleteEncounter(encounter.id);
  }
};

const handleSubmit = async (encounter: Omit<Encounter, 'id'>) => {
  if (selectedEncounter.value?.id) {
    await encounterStore.updateEncounter(selectedEncounter.value.id, encounter);
  } else {
    await encounterStore.createEncounter(encounter);
  }
  isEditorOpen.value = false;
};

const handleCancel = () => {
  isEditorOpen.value = false;
};

const handleRunCombat = (encounter: Encounter) => {
  selectedEncounterForCombat.value = encounter;
  showPartySelector.value = true;
};

const handleCombatCreated = (combat: Combat) => {
  showPartySelector.value = false;
  selectedEncounterForCombat.value = null;
  // Navigate to the combat view
  router.push(`/combats/${combat.id}`);
};

const handlePartySelectorCancel = () => {
  showPartySelector.value = false;
  selectedEncounterForCombat.value = null;
};

</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreate">+</Button>
    </div>

    <div v-if="encounterStore.filteredEncounters.length === 0" class="view-empty">
      <p>No encounters yet. Create your first encounter to get started!</p>
    </div>

    <div v-else class="view-grid">
      <EncounterCard
        v-for="encounter in encounterStore.filteredEncounters"
        :key="encounter.id"
        :encounter="encounter"
        @view="encounter => $router.push(`/encounters/${encounter.id}`)"
        @edit="handleEdit"
        @delete="handleDelete"
        @run-combat="handleRunCombat"
      />
    </div>

    <EncounterEditor
      :encounter="selectedEncounter"
      :is-open="isEditorOpen"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Party Selector Modal -->
    <PartySelector
      :is-open="showPartySelector"
      :encounter="selectedEncounterForCombat"
      @cancel="handlePartySelectorCancel"
      @combat-created="handleCombatCreated"
    />
  </div>
</template>
