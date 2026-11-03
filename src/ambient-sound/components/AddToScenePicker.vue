<template>
  <BaseModal
    :is-open="isOpen"
    modal-id="ambient-add-to-scene"
    :title="t('ambientSoundPage.addToScene')"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    @cancel="emit('close')"
    @update:is-open="(value: boolean) => !value && emit('close')"
  >
    <QList v-if="scenes.length" separator>
      <QItem
        v-for="entry in scenes"
        :key="entry.scene.id"
        clickable
        :disable="alreadyIncluded(entry.scene)"
        @click="addToScene(entry.scene)"
      >
        <QItemSection side>
          <AmbientIcon :icon="entry.scene.icon" :size="20" />
        </QItemSection>
        <QItemSection>
          <div>{{ entry.scene.name }}</div>
          <div class="text-caption text-grey-7">
            {{ entry.pack.name }}
          </div>
        </QItemSection>
        <QItemSection side>
          <QIcon
            v-if="alreadyIncluded(entry.scene)"
            name="check"
            color="primary"
          />
          <QIcon v-else name="add" />
        </QItemSection>
      </QItem>
    </QList>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.noScenesInPack')"
      :hint="t('ambientSoundPage.createSceneFirst')"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneDef } from '@/ambient-sound/types';

const props = defineProps<{
  isOpen: boolean;
  packId: string;
  kind: 'ambience' | 'oneShot';
  entryId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'added', sceneId: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();

const scenes = computed(() =>
  store.allScenes.filter(({ pack }) => pack.id === props.packId),
);

function alreadyIncluded(scene: SceneDef) {
  return props.kind === 'ambience'
    ? scene.ambiences.some((entry) => entry.ambienceId === props.entryId)
    : scene.oneShotIds.includes(props.entryId);
}

async function addToScene(scene: SceneDef) {
  if (alreadyIncluded(scene)) return;

  const updated: SceneDef =
    props.kind === 'ambience'
      ? {
          ...scene,
          ambiences: [
            ...scene.ambiences,
            {
              ambienceId: props.entryId,
              variationId: '',
              volume: 50,
            },
          ],
        }
      : {
          ...scene,
          oneShotIds: [...scene.oneShotIds, props.entryId],
        };

  await store.saveScene(props.packId, updated);
  emit('added', scene.id);
  emit('close');
}
</script>
