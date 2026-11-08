<template>
  <div class="entity-scenes-panel column">
    <div class="scene-list col-grow">
      <div v-if="!linkedScenes.length" class="text-caption text-grey-7 q-pa-md">
        {{ t('ambientSoundPage.noSceneLinks') }}
      </div>
      <QList v-else class="q-pa-none q-mb-none">
        <QItem
          v-for="entry in linkedScenes"
          :key="`${entry.pack.id}:${entry.scene.id}`"
          clickable
          v-ripple
          class="scene-link-item"
          :class="{
            'scene-link-item--selected': isActive(
              entry.pack.id,
              entry.scene.id,
            ),
            'scene-link-item--playing': isPlaying(
              entry.pack.id,
              entry.scene.id,
            ),
          }"
          @click="toggleScene(entry.pack.id, entry.scene.id)"
        >
          <QItemSection side>
            <IconHeadphones :size="18" />
          </QItemSection>
          <QItemSection>
            <div>{{ entry.scene.name }}</div>
            <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
          </QItemSection>
          <QItemSection side class="scene-link-actions row items-center">
            <IconPlayerPause
              v-if="isPlaying(entry.pack.id, entry.scene.id)"
              :size="18"
            />
            <IconPlayerPlay v-else :size="18" />
            <QBtn
              v-if="props.editable"
              flat
              dense
              size="sm"
              color="negative"
              :title="t('ambientSoundPage.removeLink')"
              :aria-label="t('ambientSoundPage.removeLink')"
              @click.stop="removeLink(entry.pack.id, entry.scene.id)"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconHeadphones,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneLinkEntityType } from '@/ambient-sound/types';

const props = withDefaults(
  defineProps<{
    entityType: SceneLinkEntityType;
    entityId: string;
    editable?: boolean;
  }>(),
  { editable: false },
);

const { t } = useI18n();
const store = useAmbientSoundStore();
const pickerOpen = ref(false);

const linkedRefs = computed(() =>
  store.linksForEntity(props.entityType, props.entityId),
);

const linkedScenes = computed(() =>
  linkedRefs.value
    .map((ref) =>
      store.allScenes.find(
        ({ pack, scene }) =>
          pack.id === ref.packageId && scene.id === ref.sceneId,
      ),
    )
    .filter((entry): entry is NonNullable<typeof entry> => !!entry),
);

const availableScenes = computed(() => {
  const linked = new Set(
    linkedRefs.value.map((ref) => `${ref.packageId}::${ref.sceneId}`),
  );
  return store.allScenes.filter(
    ({ pack, scene }) => !linked.has(`${pack.id}::${scene.id}`),
  );
});

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
  store.addSceneLink(packId, sceneId, props.entityType, props.entityId);
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

onMounted(async () => {
  if (store.storedPacks.length === 0) await store.loadStoredPacks();
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

.scene-link-item {
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
