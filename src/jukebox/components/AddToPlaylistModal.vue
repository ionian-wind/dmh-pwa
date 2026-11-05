<script setup lang="ts">
import { computed } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useJukeboxPlaylistsStore } from '../stores';
import { useJukeboxPlayerStore } from '../playerStore';
import type { JukeboxTrack } from '../types';
import type { MapEntityRef } from '@/maps/types';
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

const linkedPlaylists = computed<MapEntityRef[]>(() => {
  if (!props.track) return [];
  return playlists.value
    .filter((playlist) => playlist.trackIds.includes(props.track!.id))
    .map((playlist) => ({ kind: 'playlist' as const, id: playlist.id }));
});

async function setLinkedPlaylists(links: MapEntityRef[]) {
  if (!props.track) return;

  const trackId = props.track.id;
  const linkedIds = new Set(
    links.filter((link) => link.kind === 'playlist').map((link) => link.id),
  );

  await Promise.all(
    playlists.value.map(async (playlist) => {
      const trackIds = new Set(playlist.trackIds);
      const shouldContain = linkedIds.has(playlist.id);
      const contains = trackIds.has(trackId);
      if (shouldContain === contains) return;

      if (shouldContain) trackIds.add(trackId);
      else trackIds.delete(trackId);

      await playlistsStore.update(playlist.id, {
        trackIds: Array.from(trackIds),
      });
    }),
  );

  playerStore.actualiseQueue();
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
    <EntitiesLinking
      kind="playlist"
      :model-value="linkedPlaylists"
      @update:model-value="setLinkedPlaylists"
    />
  </BaseModal>
</template>
