<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import { useConfigStore } from '@/utils/configStore';
import { useJukeboxEditMode } from '@/jukebox/composables/useJukeboxEditMode';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';
import type { JukeboxPlaylist } from '@/jukebox/types';

import SortableList from '@/components/common/SortableList.vue';

import {
  IconEdit,
  IconGripVertical,
  IconEye,
  IconPlus,
  IconPencil,
  IconX,
} from '@tabler/icons-vue';
import { debug } from '@/utils/debug';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const playlistsStore = useJukeboxPlaylistsStore();
const playerStore = useJukeboxPlayerStore();
const configStore = useConfigStore();
const isEditMode = useJukeboxEditMode();
const playlists = playlistsStore.items;
const activeTrackId = computed(() => playerStore.currentTrack?.id ?? null);

function playlistHasActiveTrack(playlist: JukeboxPlaylist) {
  return (
    !!activeTrackId.value && playlist.trackIds.includes(activeTrackId.value)
  );
}

const filteredPlaylists = computed(() => playlists.value || []);
const selectedPlaylistId = ref<string | null>(
  configStore.jukeboxActivePlaylistId,
);
const sortedPlaylists = ref<JukeboxPlaylist[]>([]);
const isPlaylistModalOpen = ref(false);
const playlistToEdit = ref<JukeboxPlaylist | null>(null);
const {
  selectedPlaylistIds,
  hasSelectedTracks,
  togglePlaylist,
  setPlaylistOrder,
} = useJukeboxBulkSelection();
const bulkShiftClick = ref(false);

function captureBulkClick(event: MouseEvent) {
  bulkShiftClick.value = event.shiftKey;
}

function updateBulkSelection(selected: boolean) {
  togglePlaylist(playlistIdForBulk.value, selected, bulkShiftClick.value);
  bulkShiftClick.value = false;
}

const playlistIdForBulk = ref('');

function capturePlaylistBulkClick(playlistId: string, event: MouseEvent) {
  playlistIdForBulk.value = playlistId;
  captureBulkClick(event);
}

// watch(
//   filteredPlaylists,
//   (newPlaylists) =>
//     updateSortedPlaylists(newPlaylists, selectedPlaylistId.value),
//   { immediate: true, deep: true },
// );
//
// watch(
//   () => configStore.jukeboxActivePlaylistId,
//   (newPlaylistId) => {
//     selectedPlaylistId.value = newPlaylistId;
//   },
//   { immediate: true },
// );

const updateSortedPlaylists = (
  newPlaylists: JukeboxPlaylist[],
  currentPlaylistId: string | null,
) => {
  if (!newPlaylists || !Array.isArray(newPlaylists)) {
    sortedPlaylists.value = [];
    return;
  }
  let filteredPlaylists = [...newPlaylists].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  if (currentPlaylistId) {
    const currentPlaylist = playlists.value.find(
      (p: JukeboxPlaylist) => p.id === currentPlaylistId,
    );
    if (
      currentPlaylist &&
      !filteredPlaylists.find(
        (p: JukeboxPlaylist) => p.id === currentPlaylistId,
      )
    ) {
      filteredPlaylists.push(currentPlaylist);
      filteredPlaylists.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
  }
  sortedPlaylists.value = filteredPlaylists;
};

watch(
  filteredPlaylists,
  (newPlaylists) =>
    updateSortedPlaylists(newPlaylists, selectedPlaylistId.value),
  { immediate: true, deep: true },
);

watch(
  sortedPlaylists,
  (items) => setPlaylistOrder(items.map((playlist) => playlist.id)),
  { immediate: true, deep: true },
);

watch(
  () => configStore.jukeboxActivePlaylistId,
  (newPlaylistId) => {
    selectedPlaylistId.value = newPlaylistId;
  },
  { immediate: true },
);

const openPlaylistModal = (playlist: JukeboxPlaylist | null) => {
  playlistToEdit.value = playlist;
  isPlaylistModalOpen.value = true;
};

const setSelectedPlaylist = (playlistId: string | null) => {
  debug(playlistId);
  selectedPlaylistId.value = playlistId ?? null;
  configStore.jukeboxActivePlaylistId = playlistId; // Add this line
};

const handleEditorDelete = async () => {
  if (!playlistToEdit.value) return;
  const playlistId = playlistToEdit.value.id;
  isPlaylistModalOpen.value = false;
  playlistToEdit.value = null;
  await removePlaylist(playlistId);
};

const removePlaylist = async (playlistId: string) => {
  if (selectedPlaylistId.value === playlistId) {
    setSelectedPlaylist(null);
  }
  if (configStore.jukeboxActivePlaylistId === playlistId) {
    configStore.jukeboxActivePlaylistId = null;
  }
  await playlistsStore.remove(playlistId);
};

const onPlaylistSortEnd = async (event: any) => {
  const { newIndex, oldIndex } = event;
  if (newIndex === oldIndex) return;

  const newOrder = Array.from(sortedPlaylists.value);
  await Promise.all(
    newOrder.map((playlist, index) => {
      playlistsStore.update(playlist.id, { ...playlist, sortOrder: index });
    }),
  );
};

onMounted(async () => {
  await playlistsStore.load();

  setSelectedPlaylist(configStore.jukeboxActivePlaylistId);
});
</script>

<template>
  <div
    :class="[
      'q-pa-none q-gutter-none q-mb-none playlist-list-container column full-height',
      { 'is-edit-mode': isEditMode },
    ]"
  >
    <!-- Fixed 'All Tracks' entry -->
    <div>
      <QList class="q-pa-none q-mb-none">
        <QItem
          clickable
          class="playlist-all-tracks"
          :active="selectedPlaylistId === null"
          :active-class="'bg-secondary'"
          :class="{ 'has-active-track': !!activeTrackId }"
          v-ripple
          @click="setSelectedPlaylist(null)"
        >
          <QItemSection>{{ t('jukebox.allTracks') }}</QItemSection>
        </QItem>
      </QList>
      <QSeparator />
    </div>

    <!-- Scrollable, sortable playlists -->
    <QScrollArea class="q-pa-none q-mb-none col-grow" style="min-height: 0">
      <SortableList
        v-model="sortedPlaylists"
        tag="div"
        class="playlist-list"
        :disabled="!isEditMode"
        handle=".playlist-drag-handle"
        item-key="id"
        @end="onPlaylistSortEnd"
      >
        <template #item="{ element: playlist }">
          <QItem
            clickable
            :active="selectedPlaylistId === playlist.id"
            :active-class="'bg-secondary'"
            v-ripple
            @click="setSelectedPlaylist(playlist.id)"
            class="playlist-item"
            :class="{ 'has-active-track': playlistHasActiveTrack(playlist) }"
          >
            <QItemSection
              v-if="isEditMode"
              side
              class="playlist-drag-handle"
              @click.stop
            >
              <IconGripVertical :size="16" />
            </QItemSection>
            <QItemSection
              v-if="isEditMode"
              side
              class="playlist-bulk-select"
              @pointerdown.capture="
                capturePlaylistBulkClick(playlist.id, $event)
              "
              @click.stop
            >
              <QCheckbox
                :model-value="selectedPlaylistIds.has(playlist.id)"
                :disable="hasSelectedTracks"
                dense
                @update:model-value="updateBulkSelection"
              />
            </QItemSection>
            <QItemSection>
              {{ playlist.name }}
            </QItemSection>
            <QItemSection class="playlist-actions" side>
              <QBtnGroup flat>
                <QBtn
                  :size="'sm'"
                  flat
                  @click.stop="openPlaylistModal(playlist)"
                >
                  <IconPencil :size="18" />
                </QBtn>
                <QBtn
                  :size="'sm'"
                  flat
                  @click.stop="removePlaylist(playlist.id)"
                >
                  <IconX :size="18" />
                </QBtn>
              </QBtnGroup>
            </QItemSection>
          </QItem>
        </template>
      </SortableList>
    </QScrollArea>

    <QSeparator />
    <QList>
      <QItem clickable v-ripple @click="openPlaylistModal(null)">
        <QItemSection>{{ t('playlist.createNew') }}</QItemSection>
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
      </QItem>
    </QList>

    <QSeparator />
    <QList>
      <QItem class="playlist-mode-toggle">
        <QItemSection>
          <QBtnGroup spread class="full-width">
            <QBtn
              class="jukebox-view-mode"
              color="primary"
              :outline="isEditMode"
              :title="t('jukebox.viewMode')"
              :aria-label="t('jukebox.viewMode')"
              :aria-pressed="!isEditMode"
              @click="isEditMode = false"
            >
              <IconEye :size="18" />
            </QBtn>
            <QBtn
              class="jukebox-edit-mode"
              color="primary"
              :outline="!isEditMode"
              :title="t('jukebox.editMode')"
              :aria-label="t('jukebox.editMode')"
              :aria-pressed="isEditMode"
              @click="isEditMode = true"
            >
              <IconEdit :size="18" />
            </QBtn>
          </QBtnGroup>
        </QItemSection>
      </QItem>
    </QList>

    <PlaylistEditor
      v-model="isPlaylistModalOpen"
      :playlist="playlistToEdit"
      @delete="handleEditorDelete"
    />
  </div>
</template>

<style scoped>
.playlist-drag-handle {
  cursor: grab;
  color: var(--color-text-lighter);
}

.playlist-drag-handle:active {
  cursor: grabbing;
}

.has-active-track {
  box-shadow: inset 3px 0 0 var(--q-primary);
}

.playlist-actions {
  display: none;
}

.playlist-list-container.is-edit-mode .playlist-item:hover .playlist-actions {
  display: flex;
}
</style>
