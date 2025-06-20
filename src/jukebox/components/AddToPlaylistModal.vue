<template>
  <BaseModal :isOpen="modelValue" modalId="add-to-playlist" @update:isOpen="$emit('update:modelValue', $event)" title="Add to Playlist">
    <div v-if="playlists.length === 0">
      <p>No playlists found. Please create one first.</p>
    </div>
    <div v-else>
      <ul>
        <li v-for="playlist in playlists" :key="playlist.id">
          <label>
            <input
              type="checkbox"
              :checked="isTrackInPlaylist(playlist)"
              @change="togglePlaylist(playlist)"
            />
            {{ playlist.name }}
          </label>
        </li>
      </ul>
    </div>
    <div class="modal-actions">
      <button type="button" @click="$emit('update:modelValue', false)">Done</button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import type { JukeboxTrack, JukeboxPlaylist } from '../types';

const props = defineProps<{
  modelValue: boolean;
  track: JukeboxTrack | null;
}>();

defineEmits(['update:modelValue']);

const playlistsStore = useJukeboxPlaylistsStore();
const playlists = playlistsStore.items;

function isTrackInPlaylist(playlist: JukeboxPlaylist): boolean {
  if (!props.track) return false;
  return playlist.trackIds.includes(props.track.id);
}

async function togglePlaylist(playlist: JukeboxPlaylist) {
  if (!props.track) return;

  const trackId = props.track.id;
  const trackIds = new Set(playlist.trackIds);

  if (trackIds.has(trackId)) {
    trackIds.delete(trackId);
  } else {
    trackIds.add(trackId);
  }

  await playlistsStore.update(playlist.id, { trackIds: Array.from(trackIds) });
}
</script>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}
li {
  padding: 0.5em 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5em;
}
</style> 