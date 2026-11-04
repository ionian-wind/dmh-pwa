<template>
  <div class="q-pa-md ambient-sound-page">
    <div
      v-if="store.loading"
      class="q-pa-xl flex flex-center column text-grey-7"
    >
      <QSpinnerDots size="40px" color="primary" />
      <div class="q-mt-md">{{ t('ambientSoundPage.loading') }}</div>
    </div>

    <template v-else-if="store.storedPacks.length">
      <div class="ambient-tabs-sticky" :style="{ top: `${headerOffset}px` }">
        <EntityTabs v-model="activeTab" :tabs="tabs" />
      </div>

      <div class="ambient-tab-body">
        <SceneList v-if="activeTab === 'scenes'" @open="openScenePlayer" />
        <AmbienceGallery v-else-if="activeTab === 'ambiences'" />
        <OneShotGallery v-else />
      </div>
    </template>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.importPack')"
      :hint="t('ambientSoundPage.importPackHint')"
    />

    <BaseModal
      :is-open="isSceneDialogOpen"
      :use-modal-stack="false"
      :show-expand="true"
      :tabs="sceneDialogTabs"
      modal-id="ambient-scene-dialog"
      @update:is-open="(value) => (isSceneDialogOpen = value)"
      @cancel="closeSceneDialog"
    >
      <template #main>
        <ScenePlayerView
          v-if="sceneEntry"
          :pack-id="sceneEntry.pack.id"
          :scene-id="sceneEntry.scene.id"
          :show-back="false"
          @back="closeSceneDialog"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import EmptyState from '@/components/common/EmptyState.vue';
import EntityTabs from '@/components/common/EntityTabs.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import SceneList from '@/ambient-sound/components/SceneList.vue';
import AmbienceGallery from '@/ambient-sound/components/AmbienceGallery.vue';
import OneShotGallery from '@/ambient-sound/components/OneShotGallery.vue';
import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';
import SceneLinksPanel from '@/ambient-sound/components/SceneLinksPanel.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();

const activeTab = ref('scenes');
const selectedScene = ref<{ packId: string; sceneId: string } | null>(null);
const isSceneDialogOpen = ref(false);
const sceneDialogTabs = useEntityEditorTabs();
// The app header is fixed above the page, so the sticky tabs must stop below it
// instead of sliding underneath. Quasar sizes the page container to match.
const headerOffset = ref(0);
let headerResizeObserver: ResizeObserver | null = null;

function syncHeaderOffset() {
  const header = document.querySelector<HTMLElement>('.q-header');
  headerOffset.value = header?.offsetHeight ?? 0;
}

const tabs = computed(() => [
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
  { id: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { id: 'oneShots', label: t('ambientSoundPage.oneShotsTab') },
]);

const sceneEntry = computed(() => {
  if (!selectedScene.value) return null;
  return (
    store.allScenes.find(
      ({ pack, scene }) =>
        pack.id === selectedScene.value?.packId &&
        scene.id === selectedScene.value?.sceneId,
    ) ?? null
  );
});

function openScenePlayer(packId: string, sceneId: string) {
  selectedScene.value = { packId, sceneId };
  isSceneDialogOpen.value = true;
}

function closeSceneDialog() {
  isSceneDialogOpen.value = false;
}

watch(
  [sceneEntry, isSceneDialogOpen],
  () => {
    if (isSceneDialogOpen.value && !sceneEntry.value) {
      closeSceneDialog();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: { title: t('ambientSoundPage.title') },
  });
  rightDrawer.set({ component: SoundPackSidebar });
  syncHeaderOffset();
  const header = document.querySelector<HTMLElement>('.q-header');
  if (header && typeof ResizeObserver !== 'undefined') {
    headerResizeObserver = new ResizeObserver(syncHeaderOffset);
    headerResizeObserver.observe(header);
  }
  await store.loadStoredPacks();
});

onUnmounted(() => {
  headerResizeObserver?.disconnect();
  headerResizeObserver = null;
  layout.setTopMenuContent(null);
  rightDrawer.clear();
  store.stopPreview();
});
</script>

<style scoped>
.ambient-sound-page {
  max-width: 1100px;
  margin: 0 auto;
}

.ambient-tabs-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.5rem 0;
  background: var(--color-background);
}

.ambient-tab-body {
  padding-top: 1rem;
}
</style>
