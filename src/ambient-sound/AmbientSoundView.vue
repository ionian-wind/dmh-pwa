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
      <QCard flat bordered class="q-mb-md">
        <QCardSection><AmbientGlobalControl /></QCardSection>
      </QCard>

      <QCard flat bordered>
        <QCardSection>
          <TabGroup
            v-model="activeTab"
            :tabs="tabs"
            size="md"
            align="justify"
            class="q-mb-md"
          />

          <SceneList v-if="activeTab === 'scenes'" @open="openScenePlayer" />
          <AmbienceGallery v-else-if="activeTab === 'ambiences'" />
          <OneShotGallery v-else />
        </QCardSection>
      </QCard>
    </template>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.importPack')"
      :hint="t('ambientSoundPage.importPackHint')"
    />

    <ScenePlayerDialog
      :is-open="playerOpen"
      :pack-id="playerPackId"
      :scene-id="playerSceneId"
      @close="playerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import AmbientGlobalControl from '@/ambient-sound/components/AmbientGlobalControl.vue';
import SceneList from '@/ambient-sound/components/SceneList.vue';
import AmbienceGallery from '@/ambient-sound/components/AmbienceGallery.vue';
import OneShotGallery from '@/ambient-sound/components/OneShotGallery.vue';
import ScenePlayerDialog from '@/ambient-sound/components/ScenePlayerDialog.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();

const activeTab = ref('scenes');
const playerOpen = ref(false);
const playerPackId = ref('');
const playerSceneId = ref('');

const tabs = computed(() => [
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
  { id: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { id: 'oneShots', label: t('ambientSoundPage.oneShotsTab') },
]);

function openScenePlayer(packId: string, sceneId: string) {
  playerPackId.value = packId;
  playerSceneId.value = sceneId;
  playerOpen.value = true;
}

onMounted(async () => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: { title: t('ambientSoundPage.title') },
  });
  rightDrawer.set({ component: SoundPackSidebar });
  await store.loadStoredPacks();
});

onUnmounted(() => {
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
</style>
