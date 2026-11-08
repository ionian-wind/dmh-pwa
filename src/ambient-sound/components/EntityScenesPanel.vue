<template>
  <div class="entity-scenes-panel column">
    <div class="scene-list col-grow">
      <div v-if="!mixedItems.length" class="text-caption text-grey-7 q-pa-md">
        {{ t('ambientSoundPage.noSceneLinks') }}
      </div>
      <QList v-else class="q-pa-none q-mb-none">
        <QItem
          v-for="item in mixedItems"
          :key="item.key"
          v-ripple
          :clickable="item.type === 'scene'"
          :class="[
            item.type === 'scene' ? 'scene-link-item' : 'playlist-link-item',
            item.type === 'scene'
              ? {
                  'scene-link-item--selected': isActive(
                    item.scene.pack.id,
                    item.scene.scene.id,
                  ),
                  'scene-link-item--playing': isPlaying(
                    item.scene.pack.id,
                    item.scene.scene.id,
                  ),
                }
              : {},
          ]"
          @click="
            item.type === 'scene'
              ? toggleScene(item.scene.pack.id, item.scene.scene.id)
              : undefined
          "
        >
          <QItemSection side>
            <IconHeadphones v-if="item.type === 'scene'" :size="18" />
            <IconPlaylist v-else :size="18" />
          </QItemSection>
          <QItemSection>
            <div>{{ item.name }}</div>
            <div v-if="item.subtitle" class="text-caption text-grey-7">
              {{ item.subtitle }}
            </div>
          </QItemSection>
          <QItemSection side class="scene-link-actions row items-center">
            <template v-if="item.type === 'scene'">
              <IconPlayerPause
                v-if="isPlaying(item.scene.pack.id, item.scene.scene.id)"
                :size="18"
              />
              <IconPlayerPlay v-else :size="18" />
            </template>
            <QBtn
              v-if="props.editable"
              flat
              dense
              size="sm"
              color="negative"
              :title="t('ambientSoundPage.removeLink')"
              :aria-label="t('ambientSoundPage.removeLink')"
              @click.stop="
                item.type === 'scene'
                  ? removeLink(item.scene.pack.id, item.scene.scene.id)
                  : removePlaylist(item.playlist.id)
              "
            >
              <IconX :size="16" />
            </QBtn>
          </QItemSection>
        </QItem>
      </QList>
    </div>

    <QSeparator />

    <QList class="q-pa-none q-mb-none">
      <QItem
        v-if="props.scenesEnabled"
        clickable
        v-ripple
        class="scene-add-row"
        :title="t('ambientSoundPage.addSceneLink')"
        :aria-label="t('ambientSoundPage.addSceneLink')"
        @click="scenePickerOpen = true"
      >
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
        <QItemSection>
          {{ t('ambientSoundPage.addSceneLink') }}
        </QItemSection>
      </QItem>
      <QItem
        v-if="playlistStore"
        clickable
        v-ripple
        class="playlist-add-row"
        :title="t('playlist.addPlaylist')"
        :aria-label="t('playlist.addPlaylist')"
        @click="playlistPickerOpen = true"
      >
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
        <QItemSection>
          {{ t('playlist.addPlaylist') }}
        </QItemSection>
      </QItem>
    </QList>

    <EntityLinkingDialog
      v-if="props.scenesEnabled"
      :is-open="scenePickerOpen"
      kind="scene"
      :title="t('ambientSoundPage.addSceneLink')"
      :options="sceneOptions"
      :linked-ids="linkedSceneIds"
      :multiple="true"
      :allow-create="false"
      @add="addScenes"
      @cancel="scenePickerOpen = false"
    />

    <EntityLinkingDialog
      v-if="playlistStore"
      :is-open="playlistPickerOpen"
      kind="playlist"
      :title="t('playlist.addPlaylist')"
      :options="playlistOptions"
      :linked-ids="linkedPlaylistIds"
      :multiple="true"
      @add="addPlaylists"
      @cancel="playlistPickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  shallowRef,
} from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconHeadphones,
  IconPlaylist,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneLinkEntityType } from '@/ambient-sound/types';
import type { JukeboxPlaylist } from '@/jukebox/types';
import type { MapEntityRef } from '@/maps/types';

type PlaylistStore = {
  items: { value: JukeboxPlaylist[] };
  load: () => Promise<void>;
  getById: (id: string) => JukeboxPlaylist | null;
  update: (
    id: string,
    patch: { links?: MapEntityRef[] },
  ) => Promise<JukeboxPlaylist>;
};

const EntityLinkingDialog = defineAsyncComponent(
  () => import('@/components/common/EntityLinkingDialog.vue'),
);

const props = withDefaults(
  defineProps<{
    entityType: SceneLinkEntityType | 'party';
    entityId: string;
    editable?: boolean;
    scenesEnabled?: boolean;
  }>(),
  { editable: false, scenesEnabled: true },
);

const { t } = useI18n();
const store = useAmbientSoundStore();
const scenePickerOpen = ref(false);
const playlistPickerOpen = ref(false);

// Keep the jukebox dependency behind the build-time flag so builds without
// the jukebox never bundle its store into the ambient panel.
const playlistStore = shallowRef<PlaylistStore | null>(null);
let playlistStoreReady: Promise<PlaylistStore | null> = Promise.resolve(null);

if (__FEATURE_JUKEBOX__) {
  playlistStoreReady = import('@/jukebox/stores').then(
    ({ useJukeboxPlaylistsStore }) => {
      playlistStore.value = useJukeboxPlaylistsStore() as PlaylistStore;
      return playlistStore.value;
    },
  );
}

const linkedRefs = computed(() =>
  store.linksForEntity(props.entityType as SceneLinkEntityType, props.entityId),
);

const linkedScenes = computed(() =>
  props.scenesEnabled
    ? linkedRefs.value
        .map((ref) =>
          store.allScenes.find(
            ({ pack, scene }) =>
              pack.id === ref.packageId && scene.id === ref.sceneId,
          ),
        )
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    : [],
);

const sceneOptions = computed(() =>
  store.allScenes.map(({ pack, scene }) => ({
    id: `${pack.id}::${scene.id}`,
    label: `${scene.name} · ${pack.name}`,
  })),
);
const linkedSceneIds = computed(() =>
  linkedScenes.value.map(({ pack, scene }) => `${pack.id}::${scene.id}`),
);

const playlistItems = computed(() => playlistStore.value?.items.value ?? []);
const linkedPlaylistIds = computed(() =>
  playlistItems.value
    .filter((playlist) =>
      (playlist.links ?? []).some(
        (link) => link.kind === props.entityType && link.id === props.entityId,
      ),
    )
    .map((playlist) => playlist.id),
);
const linkedPlaylists = computed(() =>
  linkedPlaylistIds.value
    .map((id) => playlistStore.value?.getById(id))
    .filter((playlist): playlist is JukeboxPlaylist => !!playlist),
);
const playlistOptions = computed(() =>
  playlistItems.value.map((playlist) => ({
    id: playlist.id,
    label: playlist.name,
  })),
);

const mixedItems = computed(() =>
  [
    ...linkedScenes.value.map((scene) => ({
      type: 'scene' as const,
      key: `scene:${scene.pack.id}:${scene.scene.id}`,
      name: scene.scene.name,
      subtitle: scene.pack.name,
      scene,
    })),
    ...linkedPlaylists.value.map((playlist) => ({
      type: 'playlist' as const,
      key: `playlist:${playlist.id}`,
      name: playlist.name,
      subtitle: playlist.description ?? '',
      playlist,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name)),
);

function isActive(packId: string, sceneId: string) {
  return store.activeSceneKey === `${packId}::${sceneId}`;
}

function isPlaying(packId: string, sceneId: string) {
  return isActive(packId, sceneId) && store.isPlaying;
}

async function toggleScene(packId: string, sceneId: string) {
  if (isPlaying(packId, sceneId)) {
    store.pause();
    return;
  }
  await store.playScene(packId, sceneId);
}

function addScenes(payload: { refs: Array<{ id: string }> }) {
  const selected = new Set(payload.refs.map((ref) => ref.id));
  for (const { pack, scene } of store.allScenes) {
    const key = `${pack.id}::${scene.id}`;
    const linked = linkedSceneIds.value.includes(key);
    if (selected.has(key) && !linked) {
      store.addSceneLink(
        pack.id,
        scene.id,
        props.entityType as SceneLinkEntityType,
        props.entityId,
      );
    } else if (!selected.has(key) && linked) {
      removeLink(pack.id, scene.id);
    }
  }
  scenePickerOpen.value = false;
}

function removeLink(packId: string, sceneId: string) {
  const link = store
    .linksForScene(packId, sceneId)
    .find(
      (entry) =>
        entry.entityType === props.entityType &&
        entry.entityId === props.entityId,
    );
  if (link) store.removeSceneLink(link.id);
}

async function addPlaylists(payload: { refs: Array<{ id: string }> }) {
  const store = playlistStore.value;
  if (!store) return;
  const selected = new Set(payload.refs.map((ref) => ref.id));
  for (const playlist of store.items.value) {
    const links = (playlist.links ?? []).filter(
      (link) => !(link.kind === props.entityType && link.id === props.entityId),
    );
    if (selected.has(playlist.id)) {
      links.push({ kind: props.entityType, id: props.entityId });
    }
    await store.update(playlist.id, { links });
  }
  playlistPickerOpen.value = false;
}

async function removePlaylist(playlistId: string) {
  const store = playlistStore.value;
  const playlist = store?.getById(playlistId);
  if (!store || !playlist) return;
  const links = (playlist.links ?? []).filter(
    (link) => !(link.kind === props.entityType && link.id === props.entityId),
  );
  await store.update(playlistId, { links });
}

onMounted(async () => {
  await Promise.all([
    store.storedPacks.length === 0
      ? store.loadStoredPacks()
      : Promise.resolve(),
    playlistStoreReady.then((playlistStore) => playlistStore?.load()),
  ]);
});
</script>

<style scoped>
.entity-scenes-panel {
  height: 100%;
  min-height: 0;
}

.scene-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.scene-link-item,
.playlist-link-item {
  border-radius: var(--border-radius);
}

.scene-link-item--selected {
  background: var(--color-selected-surface) !important;
  color: var(--color-text) !important;
  font-weight: 500;
}

.scene-link-item--playing {
  box-shadow: inset 4px 0 0 var(--color-accent);
}

.scene-link-actions {
  gap: 0.15rem;
}
</style>
