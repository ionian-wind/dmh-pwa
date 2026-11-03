<template>
  <div class="q-pa-md ambient-sound-page">
    <div
      v-if="store.loading"
      class="q-pa-xl flex flex-center column text-grey-7"
    >
      <QSpinnerDots size="40px" color="primary" />
      <div class="q-mt-md">{{ t('ambientSoundPage.loading') }}</div>
    </div>

    <template v-else-if="store.currentPack">
      <QCard flat bordered class="q-mb-md">
        <QCardSection>
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
            <IconVolume :size="22" />
            <div class="col" @wheel.prevent="handleMasterVolumeWheel">
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
    </template>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.selectPack')"
      :hint="t('ambientSoundPage.sidebarHint')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
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
import { useLayout, useRightDrawer } from '@/composables/useLayout';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import MoodStateControl from '@/ambient-sound/components/MoodStateControl.vue';
import IntensitySlider from '@/ambient-sound/components/IntensitySlider.vue';
import AmbientMixer from '@/ambient-sound/components/AmbientMixer.vue';
import OneShotPanel from '@/ambient-sound/components/OneShotPanel.vue';

const { t } = useI18n();
const store = useAmbientSoundStore();
const layout = useLayout();
const rightDrawer = useRightDrawer();

function handleMasterVolumeWheel(event: WheelEvent) {
  const next = Math.round(store.masterVolume - event.deltaY * 0.1);
  store.setMasterVolume(next);
}

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
