<template>
  <div class="q-pa-md ambient-sound-page">
    <div
      v-if="store.loading"
      class="q-pa-xl flex flex-center column text-grey-7"
    >
      <QSpinnerDots size="40px" color="primary" />
      <div class="q-mt-md">{{ t('ambientSoundPage.loading') }}</div>
    </div>

    <template v-else>
      <QCard flat bordered class="q-mb-md">
        <QCardSection>
          <div class="text-subtitle1 text-weight-medium q-mb-sm">
            {{ t('ambientSoundPage.overallControl') }}
          </div>
          <div class="row items-center q-gutter-md">
            <QBtn
              round
              color="primary"
              size="lg"
              :title="t(store.isPlaying ? 'common.pause' : 'common.play')"
              :aria-label="t(store.isPlaying ? 'common.pause' : 'common.play')"
              @click="store.togglePlayPause()"
            >
              <IconPlayerPause v-if="store.isPlaying" />
              <IconPlayerPlay v-else />
            </QBtn>
            <IconVolume :size="22" />
            <div class="col">
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
                class="master-volume-slider"
                @update:model-value="
                  (v: number | null) => v !== null && store.setMasterVolume(v)
                "
              />
            </div>
            <div class="text-caption text-grey-7 master-volume-value">
              {{ store.masterVolume }}%
            </div>
          </div>
        </QCardSection>
      </QCard>

      <template v-if="store.currentPack">
        <QCard flat bordered class="q-mb-md">
          <QCardSection><MoodStateControl /></QCardSection>
        </QCard>
        <QCard flat bordered class="q-mb-md">
          <QCardSection><IntensitySlider /></QCardSection>
        </QCard>
        <QCard flat bordered class="q-mb-md">
          <QCardSection><AmbientMixer /></QCardSection>
        </QCard>
        <QCard flat bordered class="q-mb-md">
          <QCardSection><OneShotPanel /></QCardSection>
        </QCard>
        <QCard flat bordered class="q-mb-md">
          <QCardSection><WeatherPanel /></QCardSection>
        </QCard>
      </template>

      <QCard v-else flat bordered>
        <QCardSection class="flex flex-center column text-center q-pa-xl">
          <IconMusic :size="64" class="text-grey-6" />
          <div class="text-subtitle1 q-mt-md">
            {{ t('ambientSoundPage.selectPack') }}
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ t('ambientSoundPage.sidebarHint') }}
          </div>
        </QCardSection>
      </QCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconMusic,
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
} from '@tabler/icons-vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import MoodStateControl from '@/ambient-sound/components/MoodStateControl.vue';
import IntensitySlider from '@/ambient-sound/components/IntensitySlider.vue';
import AmbientMixer from '@/ambient-sound/components/AmbientMixer.vue';
import OneShotPanel from '@/ambient-sound/components/OneShotPanel.vue';
import WeatherPanel from '@/ambient-sound/components/WeatherPanel.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();

onMounted(async () => {
  layout.setTopMenuContent({
    component: ViewHeader,
    props: {
      title: t('ambientSoundPage.title'),
    },
  });
  rightDrawer.set({ component: SoundPackSidebar });
  await store.loadStoredPacks();
});

onUnmounted(() => {
  layout.setTopMenuContent(null);
  rightDrawer.clear();
  store.pause();
});
</script>

<style scoped>
.ambient-sound-page {
  max-width: 1000px;
  margin: 0 auto;
}

.master-volume-slider {
  max-width: 320px;
  margin-top: 0.25rem;
}

.master-volume-value {
  min-width: 3rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
