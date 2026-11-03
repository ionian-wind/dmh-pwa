<template>
  <div class="entity-scenes-panel q-pa-sm">
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-subtitle2 text-weight-medium">
        {{ t('ambientSoundPage.scenes') }}
      </div>
      <QBtn
        flat
        dense
        round
        color="primary"
        :title="t('ambientSoundPage.addSceneLink')"
        :aria-label="t('ambientSoundPage.addSceneLink')"
        @click="pickerOpen = true"
      >
        <IconPlus :size="18" />
      </QBtn>
    </div>

    <div v-if="linkedScenes.length" class="column q-gutter-xs">
      <QItem
        v-for="entry in linkedScenes"
        :key="`${entry.pack.id}:${entry.scene.id}`"
        clickable
        class="scene-link-item"
        :class="{ 'is-active': isActive(entry.pack.id, entry.scene.id) }"
        @click="toggleScene(entry.pack.id, entry.scene.id)"
      >
        <QItemSection side>
          <AmbientIcon :icon="entry.scene.icon" :size="20" />
        </QItemSection>
        <QItemSection>
          <div>{{ entry.scene.name }}</div>
          <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
        </QItemSection>
        <QItemSection side>
          <IconPlayerPause
            v-if="isPlaying(entry.pack.id, entry.scene.id)"
            :size="18"
          />
          <IconPlayerPlay v-else :size="18" />
        </QItemSection>
        <QItemSection side>
          <QBtn
            flat
            dense
            round
            color="negative"
            :title="t('ambientSoundPage.removeLink')"
            :aria-label="t('ambientSoundPage.removeLink')"
            @click.stop="removeLink(entry.pack.id, entry.scene.id)"
          >
            <IconX :size="16" />
          </QBtn>
        </QItemSection>
      </QItem>
    </div>

    <div v-else class="text-caption text-grey-7 q-pa-sm">
      {{ t('ambientSoundPage.noSceneLinks') }}
    </div>

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
      <div v-if="availableScenes.length" class="column q-gutter-xs">
        <QItem
          v-for="entry in availableScenes"
          :key="`${entry.pack.id}:${entry.scene.id}`"
          clickable
          @click="linkScene(entry.pack.id, entry.scene.id)"
        >
          <QItemSection side>
            <AmbientIcon :icon="entry.scene.icon" :size="20" />
          </QItemSection>
          <QItemSection>
            <div>{{ entry.scene.name }}</div>
            <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
          </QItemSection>
          <QItemSection side><IconPlus :size="16" /></QItemSection>
        </QItem>
      </div>
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
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconX,
} from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneLinkEntityType } from '@/ambient-sound/types';

const props = defineProps<{
  entityType: SceneLinkEntityType;
  entityId: string;
}>();

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
  min-height: 120px;
}

.scene-link-item {
  border-radius: var(--border-radius);
}

.scene-link-item.is-active {
  background: var(--color-background-soft);
}
</style>
