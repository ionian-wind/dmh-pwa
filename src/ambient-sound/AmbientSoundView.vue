<template>
  <QPage class="ambient-sound-page">
    <div class="page-header">
      <h1 class="page-title">{{ $t('ambientSoundPage.title') }}</h1>
      <div class="header-actions">
        <div class="master-volume">
          <IconVolume size="20" />
          <QSlider
            :model-value="store.masterVolume"
            :min="0"
            :max="100"
            :step="1"
            color="primary"
            dense
            style="width: 80px"
            @update:model-value="
              (v: number | null) => v !== null && store.setMasterVolume(v)
            "
          />
        </div>
        <QBtn
          flat
          :label="$t('ambientSoundPage.createPack')"
          @click="goToEditor"
        >
          <IconPlus size="20" style="margin-right: 8px" />
        </QBtn>
        <QBtn
          flat
          :label="$t('ambientSoundPage.importPack')"
          @click="triggerFileInput"
        >
          <IconUpload size="20" style="margin-right: 8px" />
        </QBtn>
        <input
          ref="fileInput"
          type="file"
          accept=".spk"
          style="display: none"
          @change="handleFileImport"
        />
      </div>
    </div>

    <div v-if="store.loading" class="loading-state">
      <QSpinnerDots size="40px" color="primary" />
      <p>{{ $t('ambientSoundPage.loading') }}</p>
    </div>

    <template v-else>
      <SoundPackSelector />

      <template v-if="store.currentPack">
        <MoodStateControl />
        <IntensitySlider />
        <AmbientMixer />
        <OneShotPanel />
        <WeatherPanel />
      </template>

      <div v-else class="empty-state">
        <IconMusic size="64" color="grey" />
        <p>{{ $t('ambientSoundPage.selectPack') }}</p>
        <p class="hint">{{ $t('ambientSoundPage.importHint') }}</p>
      </div>
    </template>
  </QPage>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IconVolume, IconMusic, IconUpload, IconPlus } from '@tabler/icons-vue';
import { useRouter } from 'vue-router';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundPackSelector from '@/ambient-sound/components/SoundPackSelector.vue';
import MoodStateControl from '@/ambient-sound/components/MoodStateControl.vue';
import IntensitySlider from '@/ambient-sound/components/IntensitySlider.vue';
import AmbientMixer from '@/ambient-sound/components/AmbientMixer.vue';
import OneShotPanel from '@/ambient-sound/components/OneShotPanel.vue';
import WeatherPanel from '@/ambient-sound/components/WeatherPanel.vue';

const store = useAmbientSoundStore();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

function goToEditor() {
  router.push('/ambient-sound/editor');
}

async function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await store.importPack(file);
    target.value = '';
  }
}

onMounted(async () => {
  await store.loadStoredPacks();
});

onUnmounted(() => {
  store.pause();
});
</script>

<style scoped>
.ambient-sound-page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.master-volume {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  text-align: center;
  color: #666;
}

.empty-state p {
  margin: 16px 0 8px;
}

.empty-state .hint {
  font-size: 14px;
  color: #999;
}
</style>
