<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, type Ref, computed } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ModuleMultipleSelector from '@/components/ModuleMultipleSelector.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import { useModuleStore } from '@/stores/modules';
import type { JukeboxPlaylist } from '../types';
import type { UUID } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const playlistsStore = useJukeboxPlaylistsStore();
const moduleStore = useModuleStore();

type EditablePlaylist = {
  name: string;
  description?: string;
  trackIds: UUID[];
  moduleIds?: string[];
};

const editablePlaylist: Ref<EditablePlaylist> = ref({ 
  name: '', 
  description: '', 
  trackIds: [],
  moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : []
});

watch(() => props.playlist, (newPlaylist) => {
  if (newPlaylist) {
    editablePlaylist.value = { ...newPlaylist };
  } else {
    editablePlaylist.value = { 
      name: '', 
      description: '', 
      trackIds: [],
      moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : []
    };
  }
}, { immediate: true });

watch(() => moduleStore.currentModuleFilter, (newFilter) => {
  if (!props.playlist && props.modelValue) {
    editablePlaylist.value.moduleIds = (newFilter !== 'any' && newFilter !== 'none' && newFilter) ? [newFilter] : [];
  }
});

const moduleIdsProxy = computed<string[]>({
  get() {
    return editablePlaylist.value.moduleIds ?? [];
  },
  set(val) {
    editablePlaylist.value.moduleIds = val;
  }
});

async function save() {
  if (props.playlist && props.playlist.id) {
    const updatedPlaylist = await playlistsStore.update(props.playlist.id, {
      name: editablePlaylist.value.name,
      description: editablePlaylist.value.description,
      trackIds: editablePlaylist.value.trackIds,
      moduleIds: editablePlaylist.value.moduleIds,
    });
    emit('saved', updatedPlaylist);
  } else {
    const newPlaylist = await playlistsStore.create(editablePlaylist.value);
    emit('saved', newPlaylist);
  }
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal 
    :isOpen="modelValue" 
    modalId="playlist-editor" 
    @update:isOpen="$emit('update:modelValue', $event)" 
    title="Playlist"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save"
    cancelLabel="Cancel"
    @submit="save"
    @cancel="$emit('update:modelValue', false)"
  >
    <div class="form-group">
      <label for="playlist-name">Name</label>
      <input id="playlist-name" v-model="editablePlaylist.name" type="text" required />
    </div>
    <div class="form-group">
      <label for="playlist-description">Description</label>
      <textarea id="playlist-description" v-model="editablePlaylist.description"></textarea>
    </div>
    <div class="form-group">
      <label for="playlist-modules">Modules</label>
      <ModuleMultipleSelector
        id="playlist-modules"
        v-model="moduleIdsProxy"
        placeholder="No Modules"
      />
    </div>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 1em;
}
label {
  display: block;
  margin-bottom: 0.5em;
}
input, textarea {
  width: 100%;
  padding: 0.5em;
}
</style> 