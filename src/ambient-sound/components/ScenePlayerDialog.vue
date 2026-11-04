<template>
  <BaseModal
    :is-open="modelValue"
    :use-modal-stack="false"
    :show-expand="true"
    :tabs="sceneDialogTabs"
    modal-id="ambient-scene-dialog"
    @update:is-open="(value) => emit('update:modelValue', value)"
    @cancel="close"
  >
    <template #main>
      <ScenePlayerView
        v-if="sceneEntry"
        :pack-id="sceneEntry.pack.id"
        :scene-id="sceneEntry.scene.id"
        :show-back="false"
        @back="close"
      />
    </template>
    <template #links>
      <SceneLinksPanel
        v-if="sceneEntry"
        :pack-id="sceneEntry.pack.id"
        :scene-id="sceneEntry.scene.id"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { IconEar } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';
import SceneLinksPanel from '@/ambient-sound/components/SceneLinksPanel.vue';

const props = defineProps<{
  modelValue: boolean;
  packId: string;
  sceneId: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const store = useAmbientSoundStore();

const sceneEntry = computed(
  () =>
    store.allScenes.find(
      ({ pack, scene }) =>
        pack.id === props.packId && scene.id === props.sceneId,
    ) ?? null,
);

const editorTabs = useEntityEditorTabs();
const sceneDialogTabs = computed(() =>
  editorTabs.value.map((tab) =>
    tab.name === 'main' ? { ...tab, icon: IconEar } : tab,
  ),
);

function close() {
  emit('update:modelValue', false);
}

watch(
  [sceneEntry, () => props.modelValue],
  () => {
    if (props.modelValue && !sceneEntry.value) close();
  },
  { immediate: true },
);
</script>
