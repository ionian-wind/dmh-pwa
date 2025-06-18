<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import type { Monster } from '@/types';
import ModuleMultipleSelector from "@/components/ModuleMultipleSelector.vue";
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  monster: Monster | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', monster: Monster): void;
  (e: 'cancel'): void;
}>();

const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();

const editedMonster = ref<Monster>({
  id: '',
  name: '',
  type: '',
  size: 'Medium',
  alignment: 'Unaligned',
  armorClass: 10,
  hitPoints: 10,
  speed: {
    walk: 30,
    fly: 0,
    swim: 0,
    burrow: 0,
    climb: 0
  },
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  savingThrows: {},
  skills: {},
  damageVulnerabilities: [],
  damageResistances: [],
  damageImmunities: [],
  conditionImmunities: [],
  senses: [],
  languages: ['Common'],
  challengeRating: '1/4',
  xp: 50,
  specialAbilities: [],
  actions: [],
  legendaryActions: [],
  description: '',
  moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const isEditing = computed(() => !!editedMonster.value.id);

watch(() => props.monster, (newMonster) => {
  if (newMonster) {
    editedMonster.value = { ...newMonster };
  }
}, { immediate: true });

watch(() => moduleStore.currentModuleFilter, (newFilter) => {
  if (!props.monster && props.isOpen) {
    editedMonster.value.moduleIds = (newFilter !== 'any' && newFilter !== 'none' && newFilter) ? [newFilter] : [];
  }
});

const resetForm = () => {
  editedMonster.value = {
    id: '',
    name: '',
    type: '',
    size: 'Medium',
    alignment: 'Unaligned',
    armorClass: 10,
    hitPoints: 10,
    speed: {
      walk: 30,
      fly: 0,
      swim: 0,
      burrow: 0,
      climb: 0
    },
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    savingThrows: {},
    skills: {},
    damageVulnerabilities: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    senses: [],
    languages: ['Common'],
    challengeRating: '1/4',
    xp: 50,
    specialAbilities: [],
    actions: [],
    legendaryActions: [],
    description: '',
    moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

const saveMonster = async () => {
  if (!editedMonster.value.name || !editedMonster.value.type) {
    alert('Name and type are required');
    return;
  }

  emit('submit', { ...editedMonster.value });
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

const moduleIdsProxy = computed<string[]>({
  get() {
    return editedMonster.value.moduleIds ?? [];
  },
  set(val) {
    editedMonster.value.moduleIds = val;
  }
});
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Monster' : 'Add Monster'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Monster"
    cancelLabel="Cancel"
    @submit="saveMonster"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="monster-name">Name</label>
          <input id="monster-name" v-model="editedMonster.name" type="text" required />
        </div>
        <div class="form-group">
          <label for="monster-type">Type</label>
          <input id="monster-type" v-model="editedMonster.type" type="text" required />
        </div>
        <div class="form-group">
          <label for="monster-size">Size</label>
          <select id="monster-size" v-model="editedMonster.size">
            <option value="Tiny">Tiny</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
            <option value="Huge">Huge</option>
            <option value="Gargantuan">Gargantuan</option>
          </select>
        </div>
        <div class="form-group">
          <label for="monster-alignment">Alignment</label>
          <select id="monster-alignment" v-model="editedMonster.alignment">
            <option value="Lawful Good">Lawful Good</option>
            <option value="Neutral Good">Neutral Good</option>
            <option value="Chaotic Good">Chaotic Good</option>
            <option value="Lawful Neutral">Lawful Neutral</option>
            <option value="Neutral">Neutral</option>
            <option value="Chaotic Neutral">Chaotic Neutral</option>
            <option value="Lawful Evil">Lawful Evil</option>
            <option value="Neutral Evil">Neutral Evil</option>
            <option value="Chaotic Evil">Chaotic Evil</option>
            <option value="Unaligned">Unaligned</option>
          </select>
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Stats</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="monster-ac">Armor Class</label>
          <input id="monster-ac" v-model.number="editedMonster.armorClass" type="number" min="0" />
        </div>
        <div class="form-group">
          <label for="monster-hp">Hit Points</label>
          <input id="monster-hp" v-model.number="editedMonster.hitPoints" type="number" min="1" />
        </div>
        <div class="form-group">
          <label for="monster-cr">Challenge Rating</label>
          <input id="monster-cr" v-model="editedMonster.challengeRating" type="text" />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Modules</h3>
      <div class="form-group">
        <label for="monster-modules">Modules</label>
        <ModuleMultipleSelector
          id="monster-modules"
          v-model="moduleIdsProxy"
          placeholder="No Modules"
        />
      </div>
    </div>
    <div class="form-section">
      <h3>Description</h3>
      <div class="form-group">
        <label for="monster-description">Description</label>
        <textarea id="monster-description" v-model="editedMonster.description" rows="3"></textarea>
      </div>
    </div>
    <div class="form-section">
      <h3>Languages</h3>
      <div class="form-group">
        <label for="monster-languages">Languages</label>
        <input id="monster-languages" v-model="editedMonster.languages" type="text" placeholder="Comma-separated list" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* No need for .form-section, .form-grid, .form-group, label, input, select, textarea styles here; now in global.css */
</style> 
