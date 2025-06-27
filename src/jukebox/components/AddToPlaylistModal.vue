<script setup lang="ts">
import { defineEmits } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
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

async function togglePlaylist(playlist: JukeboxPlaylist, value: boolean) {
  if (!props.track) return;

  const trackId = props.track.id;
  const trackIds = new Set(playlist.trackIds);

  if (value) {
    trackIds.add(trackId);
  } else {
    trackIds.delete(trackId);
  }

  await playlistsStore.update(playlist.id, { trackIds: Array.from(trackIds) });
}
</script>

<template>
  <BaseModal 
    :isOpen="modelValue" 
    modalId="add-to-playlist" 
    @update:isOpen="$emit('update:modelValue', $event)" 
    title="Add to Playlist"
    :showSubmit="false"
    :showCancel="true"
    cancelLabel="Done"
    @cancel="$emit('update:modelValue', false)"
  >
    <div v-if="playlists.length === 0">
      <p>No playlists found. Please create one first.</p>
    </div>
    <div v-else>
      <div class="playlist-list">
        <div 
          v-for="playlist in playlists" 
          :key="playlist.id" 
          class="playlist-item"
        >
          <ToggleSwitch
            :model-value="isTrackInPlaylist(playlist)"
            :label="playlist.name"
            @update:model-value="(value) => togglePlaylist(playlist, value)"
          />
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.playlist-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.playlist-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border, #eee);
}

.playlist-item:last-child {
  border-bottom: none;
}
</style> 
