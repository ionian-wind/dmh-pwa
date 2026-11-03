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
        <QCardSection class="row items-center q-gutter-md">
          <QBtn
            round
            color="primary"
            size="lg"
            :disable="!store.activeScene && !store.hasActiveLayers"
            :title="t(store.isPlaying ? 'common.pause' : 'common.play')"
            :aria-label="t(store.isPlaying ? 'common.pause' : 'common.play')"
            @click="store.togglePlayPause()"
          >
            <IconPlayerPause v-if="store.isPlaying" />
            <IconPlayerPlay v-else />
          </QBtn>
          <div class="col">
            <div class="text-caption text-grey-7">
              {{ t('ambientSoundPage.nowPlaying') }}
            </div>
            <div class="text-subtitle1">
              {{
                store.activeScene?.scene.name ||
                (store.hasActiveLayers
                  ? t('ambientSoundPage.ambientMix')
                  : t('ambientSoundPage.noScene'))
              }}
            </div>
            <div class="text-caption text-grey-6">
              {{ store.activeScene?.pack.name || '' }}
            </div>
          </div>
          <IconVolume :size="22" />
          <div
            class="col master-volume"
            @wheel.prevent="handleMasterVolumeWheel"
          >
            <div class="text-caption text-grey-7 q-mb-xs">
              {{ t('ambientSoundPage.masterVolume') }}
            </div>
            <QSlider
              :model-value="store.masterVolume"
              :min="0"
              :max="100"
              :step="1"
              color="primary"
              dense
              @update:model-value="
                (v: number | null) => v !== null && store.setMasterVolume(v)
              "
            />
          </div>
          <div class="text-caption text-grey-7 master-volume-value">
            {{ store.masterVolume }}%
          </div>
          <QBtn
            flat
            round
            :color="store.musicEnabled ? 'primary' : 'grey-7'"
            :title="
              t(
                store.musicEnabled
                  ? 'ambientSoundPage.musicOff'
                  : 'ambientSoundPage.musicOn',
              )
            "
            :aria-label="
              t(
                store.musicEnabled
                  ? 'ambientSoundPage.musicOff'
                  : 'ambientSoundPage.musicOn',
              )
            "
            @click="store.toggleMusic()"
          >
            <IconMusic v-if="store.musicEnabled" />
            <IconMusicOff v-else />
          </QBtn>
        </QCardSection>
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

          <SceneList
            v-if="activeTab === 'scenes'"
            @edit="openEditor"
            @create="createScene"
          />
          <AmbienceGallery
            v-else-if="activeTab === 'ambiences'"
            @add="openAddToScene"
          />
          <OneShotGallery v-else @add="openAddToScene" />
        </QCardSection>
      </QCard>
    </template>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.importPack')"
      :hint="t('ambientSoundPage.importPackHint')"
    />

    <SceneEditorModal
      :is-open="editorOpen"
      :pack-id="editorPackId"
      :scene-id="editorSceneId"
      @close="closeEditor"
      @saved="activeTab = 'scenes'"
    />

    <AddToScenePicker
      :is-open="pickerOpen"
      :pack-id="pickerPackId"
      :kind="pickerKind"
      :entry-id="pickerEntryId"
      @close="pickerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconMusic,
  IconMusicOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
} from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import SceneList from '@/ambient-sound/components/SceneList.vue';
import AmbienceGallery from '@/ambient-sound/components/AmbienceGallery.vue';
import OneShotGallery from '@/ambient-sound/components/OneShotGallery.vue';
import SceneEditorModal from '@/ambient-sound/components/SceneEditorModal.vue';
import AddToScenePicker from '@/ambient-sound/components/AddToScenePicker.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();

const activeTab = ref('scenes');
const editorOpen = ref(false);
const editorPackId = ref('');
const editorSceneId = ref<string | undefined>(undefined);
const pickerOpen = ref(false);
const pickerPackId = ref('');
const pickerKind = ref<'ambience' | 'oneShot'>('ambience');
const pickerEntryId = ref('');

const tabs = computed(() => [
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
  { id: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { id: 'oneShots', label: t('ambientSoundPage.oneShotsTab') },
]);

function handleMasterVolumeWheel(event: WheelEvent) {
  const next = Math.round(store.masterVolume - event.deltaY * 0.1);
  store.setMasterVolume(next);
}

function openEditor(packId: string, sceneId: string) {
  editorPackId.value = packId;
  editorSceneId.value = sceneId;
  editorOpen.value = true;
}

function createScene(packId: string) {
  editorPackId.value = packId;
  editorSceneId.value = undefined;
  editorOpen.value = true;
}

function closeEditor() {
  editorOpen.value = false;
}

function openAddToScene(
  packId: string,
  kind: 'ambience' | 'oneShot',
  entryId: string,
) {
  pickerPackId.value = packId;
  pickerKind.value = kind;
  pickerEntryId.value = entryId;
  pickerOpen.value = true;
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

.master-volume {
  max-width: 320px;
}

.master-volume-value {
  min-width: 3rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
