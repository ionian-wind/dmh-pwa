<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import {
  pickDirectory,
  pickFiles as pickFileSources,
  getPickedFileFromDataTransferItem,
  type PickedFile,
} from '@/utils/files';
import { extractTrackMetadata } from '@/utils/files/FileSystemUtils';
import {
  useJukeboxTracksStore,
  useJukeboxPlaylistsStore,
  usePictureUrlCacheStore,
} from '@/jukebox/stores';
import { deleteFileIfUnreferenced } from '@/utils/files/fileReferences';
import { importStoredFile } from '@/utils/files/fileStorage';
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
import {
  IconFolder,
  IconPencil,
  IconPlaylist,
  IconTrash,
} from '@tabler/icons-vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useJukeboxEditMode } from '@/jukebox/composables/useJukeboxEditMode';
import { useJukeboxImporting } from '@/jukebox/composables/useJukeboxImporting';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';
import { createWaveformSvg } from '@/jukebox/utils/waveform';
import BulkLinkingModal from '@/jukebox/components/BulkLinkingModal.vue';
import type { MapEntityRef } from '@/maps/types';

const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
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

const isAddingTracks = useJukeboxImporting();
const isAddToPlaylistModalOpen = ref(false);
const trackToAddToPlaylist = ref<JukeboxTrack | null>(null);
let dragCounter = 0;

function openAddToPlaylistModal(track: JukeboxTrack) {
  trackToAddToPlaylist.value = track;
  isAddToPlaylistModalOpen.value = true;
}

const playerStore = useJukeboxPlayerStore();
const isEditMode = useJukeboxEditMode();
const {
  selectedTrackIds,
  selectedPlaylistIds,
  hasSelectedTracks,
  hasSelectedPlaylists,
  hasSelection,
  setTrackOrder,
  selectAllTracks,
  clearSelection,
} = useJukeboxBulkSelection();

const isBulkTrackEditorOpen = ref(false);
const bulkTrackLinks = ref<MapEntityRef[]>([]);

function playTrackFromPlaylist(track: JukeboxTrack) {
  // When a track is played, update configStore to match the current selected playlist
  // configStore.jukeboxActivePlaylistId = selectedPlaylistId.value;
  playerStore.playTrackFromPlaylist(track);
}

async function deleteTrack(track: JukeboxTrack) {
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
      await deleteFileIfUnreferenced(track.fileId);
    } catch (e) {
      debugError(`Failed to delete file for track ${track.id}:`, e);
    }
  }
  const trackIndex = draggableTracks.value.findIndex((t) => t.id === track.id);
  if (trackIndex > -1) {
    draggableTracks.value.splice(trackIndex, 1);
  }
}

async function removeTrack(track: JukeboxTrack) {
  if (
    await confirm(
      t('common.confirmDelete', { title: track.title || track.fileId }),
    )
  ) {
    await deleteTrack(track);
  }
}

function openBulkTrackEditor() {
  const playlistIds = new Set<string>();
  for (const playlist of playlistsStore.items.value) {
    if (playlist.trackIds.some((id) => selectedTrackIds.value.has(id))) {
      playlistIds.add(playlist.id);
    }
  }
  bulkTrackLinks.value = [...playlistIds].map((id) => ({
    kind: 'playlist',
    id,
  }));
  isBulkTrackEditorOpen.value = true;
}

async function applyBulkTrackLinks(links: MapEntityRef[]) {
  const trackIds = [...selectedTrackIds.value];
  const linkedPlaylistIds = new Set(
    links.filter((link) => link.kind === 'playlist').map((link) => link.id),
  );

  await Promise.all(
    playlistsStore.items.value.map(async (playlist) => {
      const nextTrackIds = new Set(playlist.trackIds);
      const shouldContainTracks = linkedPlaylistIds.has(playlist.id);
      let changed = false;

      for (const trackId of trackIds) {
        if (shouldContainTracks && !nextTrackIds.has(trackId)) {
          nextTrackIds.add(trackId);
          changed = true;
        } else if (!shouldContainTracks && nextTrackIds.has(trackId)) {
          nextTrackIds.delete(trackId);
          changed = true;
        }
      }

      if (changed) {
        await playlistsStore.update(playlist.id, {
          trackIds: [...nextTrackIds],
        });
      }
    }),
  );

  playerStore.actualiseQueue();
  isBulkTrackEditorOpen.value = false;
  clearSelection();
}

async function deleteSelectedItems() {
  const total = selectedTrackIds.value.size + selectedPlaylistIds.value.size;
  if (total === 0) return;

  if (!(await confirm(t('jukebox.bulkDeleteConfirm', { count: total })))) {
    return;
  }

  const tracksToDelete = [...tracks.value].filter((track) =>
    selectedTrackIds.value.has(track.id),
  );
  for (const track of tracksToDelete) {
    await deleteTrack(track);
  }

  const playlistIds = [...selectedPlaylistIds.value];
  if (
    selectedPlaylistId.value &&
    playlistIds.includes(selectedPlaylistId.value)
  ) {
    selectedPlaylistId.value = null;
    configStore.jukeboxActivePlaylistId = null;
  }
  await Promise.all(
    playlistIds.map((playlistId) => playlistsStore.remove(playlistId)),
  );

  clearSelection();
}

const bulkHeaderButtons = computed(() => {
  if (!isEditMode.value || !hasSelection.value) return [];

  const buttons: any[] = [
    {
      icon: IconTrash,
      color: 'negative',
      title: 'common.delete',
      event: deleteSelectedItems,
    },
  ];

  if (hasSelectedTracks.value) {
    buttons.unshift({
      icon: IconPencil,
      color: 'primary',
      title: 'common.edit',
      event: openBulkTrackEditor,
    });
  }

  return buttons;
});

watch(isEditMode, (enabled) => {
  if (enabled) return;
  clearSelection();
  isBulkTrackEditorOpen.value = false;
});

watch(selectedPlaylistId, () => {
  clearSelection();
});

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
    setTrackOrder(newTracks.map((track) => track.id));
  },
  { immediate: true, deep: true },
);

async function processFiles(files: PickedFile[]) {
  const newTrackIds: string[] = [];
  for (const { file, source } of files) {
    const imported = await importStoredFile(file, source);
    const fileId = imported.file.id;
    const existingTrack = tracks.value.find((t) => t.fileId === fileId);
    if (existingTrack) {
      newTrackIds.push(existingTrack.id);
      continue;
    }
    const trackMeta = (await extractTrackMetadata(file)) as Record<string, any>;
    const waveform = await createWaveformSvg(file).catch(() => null);
    const newTrackData = {
      fileId,
      title: trackMeta.title || file.name.replace(/\.[^/.]+$/, ''),
      artist: trackMeta.artist,
      album: trackMeta.album,
      duration: trackMeta.duration,
      picture: trackMeta.picture,
      color: trackMeta.color,
      palette: trackMeta.palette,
      waveform,
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

const AUDIO_PICK_OPTIONS = {
  description: 'Audio Files',
  accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'] },
  acceptAttribute: 'audio/*,.mp3,.wav,.ogg,.flac,.aac',
};

async function pickAudioFiles() {
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;
  try {
    const files = await pickFileSources({
      multiple: true,
      ...AUDIO_PICK_OPTIONS,
    });
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

async function pickAudioFolder() {
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;
  try {
    const files = await pickDirectory({
      ...AUDIO_PICK_OPTIONS,
      recursive: true,
    });
    await processFiles(files);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled the folder picker.
    } else {
      debugError('Error picking or processing a folder:', err);
    }
  } finally {
    isAddingTracks.value = false;
  }
}

const headerButtons = computed(() => [
  {
    icon: IconFolder,
    color: 'primary',
    title: 'jukebox.addFolder',
    event: pickAudioFolder,
  },
]);

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

    const files: PickedFile[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== 'file') continue;
      const picked = await getPickedFileFromDataTransferItem(item);
      if (
        picked &&
        (picked.file.type.startsWith('audio/') ||
          /\.(mp3|wav|ogg|flac|aac)$/i.test(picked.file.name))
      ) {
        files.push(picked);
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

const cardProps = computed(() => {
  const editMode = isEditMode.value;

  return (track: JukeboxTrack) => {
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
      selectable: editMode,
      showRemove: editMode,
    };
  };
});

const allVisibleTracksSelected = computed(
  () =>
    filteredTracks.value.length > 0 &&
    filteredTracks.value.every((track) => selectedTrackIds.value.has(track.id)),
);

function selectAllVisibleTracks() {
  selectAllTracks(filteredTracks.value.map((track) => track.id));
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
  isEditMode.value = false;
  clearSelection();
  await Promise.all([tracksStore.load(), playlistsStore.load()]);

  rightDrawer.set({ component: PlaylistList });
  layout.setBottomDrawerContent({
    component: JukeboxPlayer,
    props: { animatedBackground: true, showArtwork: false },
    flushFooter: true,
  });

  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  clearSelection();
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
    <div v-if="isEditMode && hasSelectedTracks" class="jukebox-bulk-panel">
      <button
        v-if="!allVisibleTracksSelected"
        type="button"
        class="select-all-link"
        @click="selectAllVisibleTracks"
      >
        {{ t('common.selectAll') }}
      </button>
      <button
        type="button"
        class="cancel-selection-link"
        @click="clearSelection"
      >
        {{ t('common.cancelSelection') }}
      </button>
    </div>
    <BaseListView
      :items="filteredTracks"
      :card-component="TrackCard"
      :empty-message="t('common.emptyTracks')"
      :create-title="t('common.addTracks')"
      :create-loading="isAddingTracks"
      :card-props="cardProps"
      :show-search="false"
      :view-style="'list'"
      @create="pickAudioFiles"
      :draggable="isEditMode && selectedPlaylistId !== null"
      drag-handle=".track-drag-handle"
      @sort="onTracksSorted"
      :right-drawer-icon="IconPlaylist"
      :left-header-buttons="bulkHeaderButtons"
      :header-buttons="headerButtons"
    >
      <AddToPlaylistModal
        v-model="isAddToPlaylistModalOpen"
        :track="trackToAddToPlaylist"
      />
      <BulkLinkingModal
        v-model="isBulkTrackEditorOpen"
        :title="t('jukebox.bulkEditTracks')"
        kind="playlist"
        :links="bulkTrackLinks"
        @submit="applyBulkTrackLinks"
      />
    </BaseListView>
  </div>
</template>

<style scoped>
.jukebox-page {
  position: relative;
  min-height: 100%;
}

.jukebox-bulk-panel {
  position: sticky;
  /* Stay below the fixed app toolbar while the page scrolls. */
  top: 51px;
  z-index: 5;
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 24px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border-light);
}

.select-all-link,
.cancel-selection-link {
  padding: 0;
  color: var(--q-primary);
  font: inherit;
  text-decoration: underline;
  background: none;
  border: 0;
  cursor: pointer;
}

.jukebox-bulk-panel .cancel-selection-link {
  margin-left: 16px;
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
