<template>
  <BaseModal :isOpen="modelValue" modalId="playlist-editor" @update:isOpen="$emit('update:modelValue', $event)" title="Playlist">
    <form @submit.prevent="save">
      <div class="form-group">
        <label for="playlist-name">Name</label>
        <input id="playlist-name" v-model="editablePlaylist.name" type="text" required />
      </div>
      <div class="form-group">
        <label for="playlist-description">Description</label>
        <textarea id="playlist-description" v-model="editablePlaylist.description"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" @click="$emit('update:modelValue', false)">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, type Ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import type { JukeboxPlaylist } from '../types';
import type { UUID } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  playlist: JukeboxPlaylist | null;
}>();

const emit = defineEmits(['update:modelValue']);

const playlistsStore = useJukeboxPlaylistsStore();

type EditablePlaylist = {
  name: string;
  description?: string;
  trackIds: UUID[];
};

const editablePlaylist: Ref<EditablePlaylist> = ref({ name: '', description: '', trackIds: [] });

watch(() => props.playlist, (newPlaylist) => {
  if (newPlaylist) {
    editablePlaylist.value = { ...newPlaylist };
  } else {
    editablePlaylist.value = { name: '', description: '', trackIds: [] };
  }
}, { immediate: true });

async function save() {
  if (props.playlist && props.playlist.id) {
    await playlistsStore.update(props.playlist.id, {
      name: editablePlaylist.value.name,
      description: editablePlaylist.value.description,
      trackIds: editablePlaylist.value.trackIds,
    });
  } else {
    await playlistsStore.create(editablePlaylist.value);
  }
  emit('update:modelValue', false);
}
</script>

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
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5em;
  gap: 1em;
}
</style> 