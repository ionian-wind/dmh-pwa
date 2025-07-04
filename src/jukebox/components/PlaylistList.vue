<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import { useConfigStore } from '@/utils/configStore';
import type { JukeboxPlaylist } from '@/jukebox/types';

import draggable from 'vuedraggable';

import { IconPlus, IconPencil, IconX } from '@tabler/icons-vue';

const playlistsStore = useJukeboxPlaylistsStore();
const configStore = useConfigStore();
const playlists = playlistsStore.items;

const filteredPlaylists = computed(() => playlists.value || []);
const selectedPlaylistId = ref<string | null>(null);
const sortedPlaylists = ref<JukeboxPlaylist[]>([]);
const isPlaylistModalOpen = ref(false);
const playlistToEdit = ref<JukeboxPlaylist | null>(null);

watch(
  filteredPlaylists,
  (newPlaylists) =>
    updateSortedPlaylists(newPlaylists, selectedPlaylistId.value),
  { immediate: true, deep: true },
);

function updateSortedPlaylists(
  newPlaylists: JukeboxPlaylist[],
  currentPlaylistId: string | null,
) {
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
}

function openPlaylistModal(playlist: JukeboxPlaylist | null) {
  playlistToEdit.value = playlist;
  isPlaylistModalOpen.value = true;
}

function setSelectedPlaylist(playlistId: string | null) {
  selectedPlaylistId.value = playlistId ?? null;
}

async function removePlaylist(playlistId: string) {
  if (selectedPlaylistId.value === playlistId) {
    setSelectedPlaylist(null);
  }
  if (configStore.jukeboxActivePlaylistId === playlistId) {
    configStore.jukeboxActivePlaylistId = null;
  }
  await playlistsStore.remove(playlistId);
}

async function onPlaylistSortEnd(event: any) {
  const { newIndex, oldIndex } = event;
  if (newIndex === oldIndex) return;

  const newOrder = Array.from(sortedPlaylists.value);
  await Promise.all(
    newOrder.map((playlist, index) => {
      playlistsStore.update(playlist.id, { ...playlist, sortOrder: index });
    }),
  );
}

onMounted(async () => {
  await playlistsStore.load();

  setSelectedPlaylist(configStore.jukeboxActivePlaylistId);
});
</script>

<template>
  <div
    class="q-pa-none q-gutter-none q-mb-none playlist-list-container column full-height"
  >
    <!-- Fixed header and 'All Tracks' -->
    <div>
      <QList class="q-pa-none q-mb-none">
        <QItem>
          <QItemSection> Playlists </QItemSection>
          <QItemSection side>
            <QBtn flat @click="openPlaylistModal(null)" variant="light"
              ><IconPlus
            /></QBtn>
          </QItemSection>
        </QItem>
        <QSeparator />
        <QItem
          clickable
          :active="selectedPlaylistId === null"
          v-ripple
          @click="setSelectedPlaylist(null)"
        >
          <QItemSection>All Tracks</QItemSection>
        </QItem>
      </QList>
    </div>

    <!-- Scrollable, sortable playlists -->
    <QScrollArea class="q-pa-none q-mb-none col-grow" style="min-height: 0">
      <draggable
        v-model="sortedPlaylists"
        tag="div"
        class="playlist-list"
        handle=".playlist-item"
        item-key="id"
        @end="onPlaylistSortEnd"
      >
        <template #item="{ element: playlist }">
          <QItem
            clickable
            :active="selectedPlaylistId === playlist.id"
            v-ripple
            @click="setSelectedPlaylist(playlist.id)"
            class="playlist-item"
          >
            <QItemSection>
              {{ playlist.name }}
            </QItemSection>
            <QItemSection side>
              <QBtnGroup flat>
                <QBtn flat @click.stop="openPlaylistModal(playlist)"
                  ><IconPencil
                /></QBtn>
                <QBtn flat @click.stop="removePlaylist(playlist.id)"
                  ><IconX
                /></QBtn>
              </QBtnGroup>
            </QItemSection>
          </QItem>
        </template>
      </draggable>
    </QScrollArea>

    <PlaylistEditor v-model="isPlaylistModalOpen" :playlist="playlistToEdit" />
  </div>
</template>

<style scoped>
.playlist-list-container {
  height: 100%;
  min-height: 0;
}
</style>
