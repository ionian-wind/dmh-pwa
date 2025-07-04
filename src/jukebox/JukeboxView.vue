<script setup lang="ts">
import {
  inject,
  ref,
  onMounted,
  computed,
  watch,
  onBeforeUnmount,
  markRaw,
} from 'vue';
import {
  pickAudioFiles,
  getFileFromHandle,
  extractTrackMetadata,
} from '@/jukebox/FileSystemUtils';
import {
  useJukeboxTracksStore,
  useJukeboxPlaylistsStore,
  useJukeboxFilesStore,
  deleteJukeboxFile,
  putJukeboxFile,
  getJukeboxFile,
  usePictureUrlCacheStore,
} from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import TrackCard from '@/jukebox/components/TrackCard.vue';
import BaseListView from '@/components/common/BaseListView.vue';
import { useConfigStore } from '@/utils/configStore';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';
import { useI18n } from 'vue-i18n';
import { debugError } from '@/utils/debug';
import PlaylistList from './components/PlaylistList.vue';
import { ComponentInjection } from '@/types';

const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();
const configStore = useConfigStore();

const pictureUrlCacheStore = usePictureUrlCacheStore();
const { t } = useI18n();

if (!configStore) {
  throw new Error(
    'configStore is not defined. Make sure useConfigStore() is called correctly.',
  );
}

const tracks = tracksStore.items;

// configStore.jukeboxActivePlaylistId is always a Ref<string|null>, never null. Only .value can be null.
const selectedPlaylistId = ref<string | null>(null);

const isAddingTracks = ref(false);
const isAddToPlaylistModalOpen = ref(false);
const trackToAddToPlaylist = ref<JukeboxTrack | null>(null);

function openAddToPlaylistModal(track: JukeboxTrack) {
  trackToAddToPlaylist.value = track;
  isAddToPlaylistModalOpen.value = true;
}

const playerStore = useJukeboxPlayerStore();

function playTrackFromPlaylist(track: JukeboxTrack) {
  // When a track is played, update configStore to match the current selected playlist
  configStore.jukeboxActivePlaylistId = selectedPlaylistId.value;
  playerStore.playTrackFromPlaylist(track);
}

async function removeTrack(track: JukeboxTrack) {
  await playerStore.removeTrackFromQueue(track);

  const playlistsToUpdate = playlistsStore.items.value.filter(
    (p: JukeboxPlaylist) => p.trackIds.includes(track.id),
  );

  await Promise.all(
    playlistsToUpdate.map((p) =>
      playlistsStore.update(p.id, {
        trackIds: p.trackIds.filter((tid: string) => tid !== track.id),
      }),
    ),
  );

  await tracksStore.remove(track.id);

  if (track.fileId) {
    try {
      await deleteJukeboxFile(track.fileId);
    } catch (e) {
      debugError(`Failed to delete file handle for track ${track.id}:`, e);
    }
  }
  const trackIndex = draggableTracks.value.findIndex((t) => t.id === track.id);
  if (trackIndex > -1) {
    draggableTracks.value.splice(trackIndex, 1);
  }
}

const filteredTracks = computed(() =>
  selectedPlaylistId.value
    ? ((playlistsStore
        .getById(selectedPlaylistId.value)
        ?.trackIds.map((trackId: string) =>
          tracks.value.find((t) => t.id === trackId),
        )
        .filter(Boolean) ?? []) as JukeboxTrack[])
    : tracks.value,
);

const draggableTracks = ref<JukeboxTrack[]>([]);
watch(
  filteredTracks,
  (newTracks) => {
    draggableTracks.value = [...newTracks];
  },
  { immediate: true, deep: true },
);

async function pickFiles() {
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;
  try {
    const handles = await pickAudioFiles();
    const newTrackIds: string[] = [];
    for (const handle of handles) {
      const file = await getFileFromHandle(handle);
      const fileId = `${file.name}-${file.lastModified}-${file.size}`;
      const existingFile = await getJukeboxFile(fileId);
      await putJukeboxFile({
        id: fileId,
        handle: handle,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        createdAt: existingFile?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      const trackMeta = await extractTrackMetadata(file);
      const newTrackData = {
        fileId,
        title: trackMeta.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: trackMeta.artist,
        album: trackMeta.album,
        duration: trackMeta.duration,
        picture: trackMeta.picture,
        color: trackMeta.color,
        palette: trackMeta.palette,
        playlistIds: [],
        genre: trackMeta.genre,
        year: trackMeta.year,
        trackNumber: trackMeta.trackNumber,
        discNumber: trackMeta.discNumber,
        composer: trackMeta.composer,
        comment: trackMeta.comment,
        lyrics: trackMeta.lyrics,
      };
      const createdTrack = await tracksStore.create(newTrackData);
      newTrackIds.push(createdTrack.id);
    }
    if (selectedPlaylistId.value) {
      const playlist = playlistsStore.items.value.find(
        (p: JukeboxPlaylist) => p.id === selectedPlaylistId.value,
      );
      if (playlist) {
        const updatedTrackIds = [...playlist.trackIds, ...newTrackIds];
        await playlistsStore.update(playlist.id, { trackIds: updatedTrackIds });
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled file picker, do nothing.
    } else {
      debugError('Error picking or processing files:', err);
    }
  } finally {
    isAddingTracks.value = false;
  }
}

const trackClick = (track: JukeboxTrack) =>
  playerStore.trackIsActive(track, selectedPlaylistId.value)
    ? playerStore.togglePlay()
    : playTrackFromPlaylist(track);

function cardProps(track: JukeboxTrack) {
  const active = playerStore.trackIsActive(track, selectedPlaylistId.value);
  return {
    track,
    isSelected: active,
    isPlaying: playerStore.isPlaying && active,
    onAddToPlaylist: () => openAddToPlaylistModal(track),
    onRemove: () => removeTrack(track),
    onPlay: () => trackClick(track),
  };
}

async function onTracksSorted(newOrder: JukeboxTrack[]) {
  if (!selectedPlaylistId.value) return;
  const playlist = playlistsStore.getById(selectedPlaylistId.value);
  if (!playlist) return;

  const newTrackIds = newOrder.map((t) => t.id);

  await playlistsStore.update(playlist.id, {
    ...playlist,
    trackIds: newTrackIds,
  });

  playerStore.resortQueue(selectedPlaylistId.value);
}

const setRightDrawerContent = inject('setRightDrawerContent') as (
  arg: ComponentInjection,
) => void;
const setBottomDrawerContent = inject('setBottomDrawerContent') as (
  arg: ComponentInjection,
) => void;

onMounted(async () => {
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load(),
  ]);

  setRightDrawerContent({ component: PlaylistList });
  setBottomDrawerContent({
    component: JukeboxPlayer,
    props: { animatedBackground: true, showArtwork: false },
  });
});

onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
  setRightDrawerContent(null);
  setBottomDrawerContent(null);
});
</script>

<template>
  <BaseListView
    :items="filteredTracks"
    :card-component="TrackCard"
    :empty-message="t('common.emptyTracks')"
    :create-title="t('common.addTracks')"
    :card-props="cardProps"
    :show-search="false"
    :view-style="'list'"
    @create="pickFiles"
    :draggable="selectedPlaylistId !== null"
    @sort="onTracksSorted"
  >
    <AddToPlaylistModal
      v-model="isAddToPlaylistModalOpen"
      :track="trackToAddToPlaylist"
    />
  </BaseListView>
</template>
