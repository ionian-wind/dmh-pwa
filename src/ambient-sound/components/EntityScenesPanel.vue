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
        @click="pickerOpen = true"
      >
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
        <QItemSection>
          {{ t('ambientSoundPage.addSceneLink') }}
        </QItemSection>
      </QItem>
      <QItem
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

    <BaseModal
      :is-open="pickerOpen"
      modal-id="ambient-entity-scene-link-picker"
      :title="t('ambientSoundPage.addSceneLink')"
      :show-submit="false"
      :show-cancel="true"
      :cancel-label="t('common.close')"
      @cancel="pickerOpen = false"
      @update:is-open="(value: boolean) => !value && (pickerOpen = false)"
    >
      <QList v-if="availableScenes.length" class="q-pa-none">
        <QItem
          v-for="entry in availableScenes"
          :key="`${entry.pack.id}:${entry.scene.id}`"
          clickable
          v-ripple
          @click="linkScene(entry.pack.id, entry.scene.id)"
        >
          <QItemSection>
            <div>{{ entry.scene.name }}</div>
            <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
          </QItemSection>
          <QItemSection side><IconPlus :size="16" /></QItemSection>
        </QItem>
      </QList>
      <div v-else class="text-caption text-grey-7 q-pa-sm">
        {{ t('ambientSoundPage.noScenes') }}
      </div>
    </BaseModal>

    <EntityLinkingDialog
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
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconHeadphones,
  IconPlaylist,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneLinkEntityType } from '@/ambient-sound/types';
import type { MapEntityRef } from '@/maps/types';

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
const playlistsStore = useJukeboxPlaylistsStore();
const pickerOpen = ref(false);
const playlistPickerOpen = ref(false);

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

const availableScenes = computed(() => {
  const linked = new Set(
    linkedRefs.value.map((ref) => `${ref.packageId}::${ref.sceneId}`),
  );
  return store.allScenes.filter(
    ({ pack, scene }) => !linked.has(`${pack.id}::${scene.id}`),
  );
});

const linkedPlaylistIds = computed(() =>
  playlistsStore.items.value
    .filter((playlist) =>
      (playlist.links ?? []).some(
        (link) => link.kind === props.entityType && link.id === props.entityId,
      ),
    )
    .map((playlist) => playlist.id),
);
const linkedPlaylists = computed(() =>
  linkedPlaylistIds.value
    .map((id) => playlistsStore.getById(id))
    .filter((playlist): playlist is NonNullable<typeof playlist> => !!playlist),
);
const playlistOptions = computed(() =>
  playlistsStore.items.value.map((playlist) => ({
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

function linkScene(packId: string, sceneId: string) {
  store.addSceneLink(
    packId,
    sceneId,
    props.entityType as SceneLinkEntityType,
    props.entityId,
  );
  pickerOpen.value = false;
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

async function addPlaylists(payload: { refs: MapEntityRef[] }) {
  const selected = new Set(payload.refs.map((ref) => ref.id));
  for (const playlist of playlistsStore.items.value) {
    const links = (playlist.links ?? []).filter(
      (link) => !(link.kind === props.entityType && link.id === props.entityId),
    );
    if (selected.has(playlist.id)) {
      links.push({ kind: props.entityType, id: props.entityId });
    }
    await playlistsStore.update(playlist.id, { links });
  }
  playlistPickerOpen.value = false;
}

async function removePlaylist(playlistId: string) {
  const playlist = playlistsStore.getById(playlistId);
  if (!playlist) return;
  const links = (playlist.links ?? []).filter(
    (link) => !(link.kind === props.entityType && link.id === props.entityId),
  );
  await playlistsStore.update(playlistId, { links });
}

onMounted(async () => {
  await Promise.all([
    store.storedPacks.length === 0
      ? store.loadStoredPacks()
      : Promise.resolve(),
    playlistsStore.load(),
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
