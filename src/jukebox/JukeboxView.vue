<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import { fileHandler } from '@/utils/files';
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
import { confirm } from '@/dialogs';
import { IconPlaylist } from '@tabler/icons-vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';

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

// Add watcher to sync with configStore
watch(
  () => configStore.jukeboxActivePlaylistId,
  (newPlaylistId) => {
    selectedPlaylistId.value = newPlaylistId;
  },
  { immediate: true },
);

const isAddingTracks = ref(false);
const isAddToPlaylistModalOpen = ref(false);
const trackToAddToPlaylist = ref<JukeboxTrack | null>(null);
let dragCounter = 0;

function openAddToPlaylistModal(track: JukeboxTrack) {
  trackToAddToPlaylist.value = track;
  isAddToPlaylistModalOpen.value = true;
}

const playerStore = useJukeboxPlayerStore();

function playTrackFromPlaylist(track: JukeboxTrack) {
  // When a track is played, update configStore to match the current selected playlist
  // configStore.jukeboxActivePlaylistId = selectedPlaylistId.value;
  playerStore.playTrackFromPlaylist(track);
}

async function removeTrack(track: JukeboxTrack) {
  if (
    await confirm(
      t('common.confirmDelete', { title: track.title || track.fileId }),
    )
  ) {
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

    const sharesFile = tracks.value.some(
      (t) => t.id !== track.id && t.fileId === track.fileId,
    );
    if (track.fileId && !sharesFile) {
      try {
        await deleteJukeboxFile(track.fileId);
      } catch (e) {
        debugError(`Failed to delete file handle for track ${track.id}:`, e);
      }
    }
    const trackIndex = draggableTracks.value.findIndex(
      (t) => t.id === track.id,
    );
    if (trackIndex > -1) {
      draggableTracks.value.splice(trackIndex, 1);
    }
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

async function processFiles(
  files: {
    file: File;
    source:
      | { kind: 'handle'; handle: FileSystemFileHandle }
      | { kind: 'blob'; blob: Blob };
  }[],
) {
  const newTrackIds: string[] = [];
  for (const { file, source } of files) {
    const fileId = `${file.name}-${file.lastModified}-${file.size}`;
    const existingFile = await getJukeboxFile(fileId);
    const existingTrack = tracks.value.find((t) => t.fileId === fileId);
    if (existingTrack) {
      newTrackIds.push(existingTrack.id);
      continue;
    }
    await putJukeboxFile({
      id: fileId,
      source: source,
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      createdAt: existingFile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    const trackMeta = (await fileHandler.extractTrackMetadata(file)) as Record<
      string,
      any
    >;
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
      const updatedTrackIds = [
        ...new Set([...playlist.trackIds, ...newTrackIds]),
      ];
      await playlistsStore.update(playlist.id, { trackIds: updatedTrackIds });
    }
  }

  playerStore.actualiseQueue();
}

async function pickFiles() {
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;
  try {
    const files = await fileHandler.pickAudioFiles();
    await processFiles(files);
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

const isDragging = ref(false);

async function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  dragCounter = 0;
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;

  try {
    const items = event.dataTransfer?.items;
    if (!items) return;

    const files: {
      file: File;
      source:
        | { kind: 'handle'; handle: FileSystemFileHandle }
        | { kind: 'blob'; blob: Blob };
    }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const handle = await fileHandler.getAsFileSystemHandle(item);
        if (handle) {
          const file = await fileHandler.getFile({ kind: 'handle', handle });
          if (
            file.type.startsWith('audio/') ||
            /\.(mp3|wav|ogg|flac|aac)$/i.test(file.name)
          ) {
            files.push({ file, source: { kind: 'handle', handle } });
          }
        } else {
          const file = item.getAsFile();
          if (
            file &&
            (file.type.startsWith('audio/') ||
              /\.(mp3|wav|ogg|flac|aac)$/i.test(file.name))
          ) {
            files.push({ file, source: { kind: 'blob', blob: file } });
          }
        }
      }
    }
    if (files.length > 0) {
      await processFiles(files);
    }
  } catch (err) {
    debugError('Error processing dropped files:', err);
  } finally {
    isAddingTracks.value = false;
  }
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dragCounter++;
  isDragging.value = true;
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function onDragLeave(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return;
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragging.value = false;
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
    onPlayNext: () => playerStore.queueTrackNext(track),
    onPlayLast: () => playerStore.queueTrackLast(track),
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

const layout = useLayout();
const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load(),
  ]);

  rightDrawer.set({ component: PlaylistList });
  layout.setBottomDrawerContent({
    component: JukeboxPlayer,
    props: { animatedBackground: true, showArtwork: false },
  });

  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
  rightDrawer.clear();
  layout.setBottomDrawerContent(null);

  document.removeEventListener('dragenter', onDragEnter);
  document.removeEventListener('dragover', onDragOver);
  document.removeEventListener('dragleave', onDragLeave);
  document.removeEventListener('drop', onDrop);
});
</script>

<template>
  <div class="jukebox-page">
    <div v-if="isDragging" class="drop-zone-active">
      {{ t('common.dropAudioFiles') }}
    </div>
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
      :right-drawer-icon="IconPlaylist"
    >
      <AddToPlaylistModal
        v-model="isAddToPlaylistModalOpen"
        :track="trackToAddToPlaylist"
      />
    </BaseListView>
  </div>
</template>

<style scoped>
.jukebox-page {
  position: relative;
  min-height: 100%;
}
.drop-zone-active {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--q-primary);
  background-color: color-mix(in srgb, var(--q-primary) 10%, transparent);
  border: 3px dashed var(--q-primary);
  z-index: 9999;
  pointer-events: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style>
