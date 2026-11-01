<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import { useJukeboxPlayerStore } from '../playerStore';
import type { JukeboxTrack, JukeboxPlaylist } from '../types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  track: JukeboxTrack | null;
}>();

defineEmits(['update:modelValue']);

const playlistsStore = useJukeboxPlaylistsStore();
const playerStore = useJukeboxPlayerStore();
const playlists = playlistsStore.items;
const { t } = useI18n();

const newPlaylistName = ref('');
const isCreating = ref(false);
const canCreate = computed(
  () => !!props.track && newPlaylistName.value.trim().length > 0,
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) {
      newPlaylistName.value = '';
      isCreating.value = false;
    }
  },
);

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
  playerStore.actualiseQueue();
}

async function createPlaylistAndAdd() {
  if (!props.track || !canCreate.value || isCreating.value) return;

  isCreating.value = true;
  try {
    const sortOrder =
      playlists.value.reduce(
        (max, playlist) => Math.max(max, playlist.sortOrder ?? 0),
        0,
      ) + 1;

    await playlistsStore.create({
      name: newPlaylistName.value.trim(),
      description: '',
      trackIds: [props.track.id],
      moduleIds: [],
      sortOrder,
    });

    newPlaylistName.value = '';
    playerStore.actualiseQueue();
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <BaseModal
    :isOpen="modelValue"
    modalId="add-to-playlist"
    @update:isOpen="$emit('update:modelValue', $event)"
    :title="t('common.addToPlaylist')"
    :showSubmit="false"
    :showCancel="true"
    :cancelLabel="t('common.done')"
    @cancel="$emit('update:modelValue', false)"
  >
    <div class="create-playlist">
      <div class="create-playlist-title">{{ t('playlist.createNew') }}</div>
      <div class="create-playlist-row">
        <QInput
          id="new-playlist-name"
          v-model="newPlaylistName"
          :placeholder="t('playlist.namePlaceholder')"
          :disable="!track"
          dense
          outlined
          class="create-playlist-input"
          @keyup.enter="createPlaylistAndAdd"
        />
        <QBtn
          color="primary"
          :label="t('common.create')"
          :disable="!canCreate"
          :loading="isCreating"
          @click="createPlaylistAndAdd"
        />
      </div>
    </div>

    <div v-if="playlists.length === 0" class="empty-playlists">
      <p>{{ t('playlist.none') }}</p>
    </div>
    <div v-else class="playlist-list">
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
  </BaseModal>
</template>

<style scoped>
.create-playlist {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #eee);
}

.create-playlist-title {
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.create-playlist-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.create-playlist-input {
  flex: 1 1 auto;
}

.empty-playlists {
  color: var(--color-text-light);
}

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
