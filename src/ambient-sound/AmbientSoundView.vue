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
      <ScenePlayerView
        v-if="selectedScene"
        :pack-id="selectedScene.packId"
        :scene-id="selectedScene.sceneId"
        @back="goBack"
      />

      <template v-else>
        <div class="ambient-tabs-sticky" :style="{ top: `${headerOffset}px` }">
          <EntityTabs v-model="activeTab" :tabs="tabs" />
        </div>

        <div class="ambient-tab-body">
          <SceneList v-if="activeTab === 'scenes'" @open="openScenePlayer" />
          <AmbienceGallery v-else-if="activeTab === 'ambiences'" />
          <OneShotGallery v-else />
        </div>
      </template>
    </template>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.importPack')"
      :hint="t('ambientSoundPage.importPackHint')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { IconMusic } from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EntityTabs from '@/components/common/EntityTabs.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import AmbientGlobalControl from '@/ambient-sound/components/AmbientGlobalControl.vue';
import SceneList from '@/ambient-sound/components/SceneList.vue';
import AmbienceGallery from '@/ambient-sound/components/AmbienceGallery.vue';
import OneShotGallery from '@/ambient-sound/components/OneShotGallery.vue';
import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();
const route = useRoute();
const router = useRouter();

const activeTab = ref('scenes');

const selectedScene = computed(() => {
  const sceneId =
    typeof route.params.sceneId === 'string' ? route.params.sceneId : '';
  if (!sceneId) return null;
  const match = store.allScenes.find(({ scene }) => scene.id === sceneId);
  return { packId: match?.pack.id ?? '', sceneId };
});
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

function openScenePlayer(_packId: string, sceneId: string) {
  void router.push({ name: 'ambient-scene', params: { sceneId } });
}

function goBack() {
  void router.push({ name: 'ambient-sound' });
}

onMounted(async () => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: { title: t('ambientSoundPage.title') },
  });
  rightDrawer.set({ component: SoundPackSidebar });
  layout.setBottomDrawerContent({
    component: AmbientGlobalControl,
  });
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
  layout.setBottomDrawerContent(null);
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
