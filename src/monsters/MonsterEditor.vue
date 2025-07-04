<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Monster } from '@/types';
import ModuleMultipleSelector from "@/components/ModuleMultipleSelector.vue";
import BaseModal from '@/components/common/BaseModal.vue';

const moduleStore = useModuleStore();

const props = defineProps<{
  monster: Monster | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', monster: Monster): void;
  (e: 'cancel'): void;
}>();

const blankMonster = (): Monster => ({
  id: '',
  name: '',
  notes: '',
  moduleIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const editedMonster = ref<Monster>(blankMonster());

const isEditing = computed(() => !!props.monster?.id);

watch(() => props.monster, (newMonster) => {
  if (newMonster) {
    editedMonster.value = { ...newMonster };
  } else {
    editedMonster.value = blankMonster();
  }
}, { immediate: true, deep: true });


watch(() => props.isOpen, (newVal) => {
  if (newVal && !props.monster) {
    editedMonster.value = blankMonster();
  }
});

const resetForm = () => {
  editedMonster.value = blankMonster();
};

const saveMonster = async () => {
  if (!editedMonster.value.name) {
    alert('Name is required');
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
    modalId="monster-editor-modal"
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
      <h3>Notes</h3>
      <div class="form-group">
        <label for="monster-notes">Notes</label>
        <textarea id="monster-notes" v-model="editedMonster.notes" rows="3"></textarea>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
</style> 
