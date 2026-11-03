<template>
  <QPage class="pack-editor-page">
    <div class="page-header">
      <h1 class="page-title">
        {{
          isEditing
            ? $t('ambientSoundPage.editPack')
            : $t('ambientSoundPage.createPack')
        }}
      </h1>
      <div class="header-actions">
        <QBtn flat :label="$t('app.cancel')" @click="goBack" />
        <QBtn
          color="primary"
          :label="$t('app.save')"
          @click="savePack"
          :disable="!isValid"
        />
      </div>
    </div>

    <div class="editor-content">
      <div class="editor-section">
        <h3>{{ $t('ambientSoundPage.packInfo') }}</h3>
        <QInput
          v-model="packData.name"
          :label="$t('notes.fields.title')"
          outlined
          dense
        />
        <QInput
          v-model="packData.description"
          :label="$t('notes.fields.content')"
          type="textarea"
          outlined
          rows="3"
        />
        <QSelect
          v-model="packData.category"
          :options="categoryOptions"
          :label="$t('ambientSoundPage.category')"
          outlined
          dense
        />
        <div class="intensity-input">
          <span
            >{{ $t('ambientSoundPage.intensity') }}:
            {{ packData.defaultIntensity }}%</span
          >
          <QSlider
            v-model="packData.defaultIntensity"
            :min="0"
            :max="100"
            color="primary"
          />
        </div>
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>{{ $t('ambientSoundPage.ambientLayers') }}</h3>
          <QBtn
            flat
            size="sm"
            color="primary"
            :label="$t('app.add')"
            @click="addLayer"
          />
        </div>
        <div class="items-list">
          <div
            v-for="(layer, index) in packData.layers"
            :key="index"
            class="item-card"
          >
            <div class="item-fields">
              <QInput
                v-model="layer.name"
                :label="$t('ambientSoundPage.name')"
                dense
                outlined
              />
              <QInput
                v-model="layer.icon"
                :label="$t('ambientSoundPage.icon')"
                dense
                outlined
                style="width: 80px"
              />
              <QInput
                v-model.number="layer.defaultVolume"
                type="number"
                :label="$t('ambientSoundPage.volume')"
                dense
                outlined
                style="width: 100px"
              />
            </div>
            <div class="item-file">
              <QBtn
                flat
                size="sm"
                :label="
                  layer.file
                    ? getFileName(layer.file)
                    : $t('ambientSoundPage.selectFile')
                "
                @click="pickLayerFile(index)"
              />
            </div>
            <QBtn flat round size="sm" @click="removeLayer(index)">
              <IconX size="18" />
            </QBtn>
          </div>
          <div v-if="packData.layers.length === 0" class="empty-message">
            {{ $t('ambientSoundPage.noLayers') }}
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>{{ $t('ambientSoundPage.oneShots') }}</h3>
          <QBtn
            flat
            size="sm"
            color="primary"
            :label="$t('app.add')"
            @click="addOneShot"
          />
        </div>
        <div class="items-list">
          <div
            v-for="(sfx, index) in packData.oneShots"
            :key="index"
            class="item-card"
          >
            <div class="item-fields">
              <QInput
                v-model="sfx.name"
                :label="$t('ambientSoundPage.name')"
                dense
                outlined
              />
              <QSelect
                v-model="sfx.category"
                :options="sfxCategoryOptions"
                :label="$t('ambientSoundPage.category')"
                dense
                outlined
                style="width: 140px"
              />
              <QInput
                v-model.number="sfx.volume"
                type="number"
                :label="$t('ambientSoundPage.volume')"
                dense
                outlined
                style="width: 100px"
              />
            </div>
            <div class="item-file">
              <QBtn
                flat
                size="sm"
                :label="
                  sfx.file
                    ? getFileName(sfx.file)
                    : $t('ambientSoundPage.selectFile')
                "
                @click="pickSfxFile(index)"
              />
            </div>
            <QBtn flat round size="sm" @click="removeOneShot(index)">
              <IconX size="18" />
            </QBtn>
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>{{ $t('ambientSoundPage.weather') }}</h3>
          <QBtn
            flat
            size="sm"
            color="primary"
            :label="$t('app.add')"
            @click="addWeather"
          />
        </div>
        <div class="items-list">
          <div
            v-for="(weather, index) in packData.weatherSystems"
            :key="index"
            class="item-card"
          >
            <div class="item-fields">
              <QInput
                v-model="weather.name"
                :label="$t('ambientSoundPage.name')"
                dense
                outlined
              />
              <QInput
                v-model="weather.icon"
                :label="$t('ambientSoundPage.icon')"
                dense
                outlined
                style="width: 80px"
              />
            </div>
            <div class="item-file">
              <QBtn
                flat
                size="sm"
                :label="
                  weather.file
                    ? getFileName(weather.file)
                    : $t('ambientSoundPage.selectFile')
                "
                @click="pickWeatherFile(index)"
              />
            </div>
            <QBtn flat round size="sm" @click="removeWeather(index)">
              <IconX size="18" />
            </QBtn>
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-header">
          <h3>{{ $t('ambientSoundPage.moodStates') }}</h3>
        </div>
        <div class="mood-states-grid">
          <div
            v-for="mood in packData.moodStates"
            :key="mood.state"
            class="mood-state-card"
          >
            <div class="mood-state-header">
              <span class="mood-icon">{{ mood.icon }}</span>
              <QInput v-model="mood.name" dense outlined />
            </div>
            <QBtn
              flat
              size="sm"
              :label="
                mood.musicFile
                  ? getFileName(mood.musicFile)
                  : $t('ambientSoundPage.selectMusic')
              "
              @click="pickMusicFile(mood.state)"
            />
          </div>
        </div>
      </div>
    </div>
  </QPage>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { confirm } from '@/dialogs';
import { IconX, IconDownload } from '@tabler/icons-vue';
import { fileHandler } from '@/utils/files';
import {
  saveSoundPack,
  exportSoundPackAsFile,
} from '@/ambient-sound/utils/packManager';
import type {
  LayerDef,
  OneShotDef,
  WeatherDef,
  MoodStateDef,
  SoundPackManifest,
} from '@/ambient-sound/types';

const router = useRouter();
const { t } = useI18n();

const isEditing = ref(false);

interface LayerFormData extends LayerDef {
  fileHandle?: FileSystemFileHandle;
  fileBlob?: Blob;
}

interface SfxFormData extends OneShotDef {
  fileHandle?: FileSystemFileHandle;
  fileBlob?: Blob;
}

interface WeatherFormData extends WeatherDef {
  fileHandle?: FileSystemFileHandle;
  fileBlob?: Blob;
}

interface MoodFormData extends MoodStateDef {
  musicFileHandle?: FileSystemFileHandle;
  musicFileBlob?: Blob;
}

interface PackFormData {
  id: string;
  name: string;
  description: string;
  category: 'fantasy' | 'scifi' | 'horror' | 'modern' | 'custom';
  defaultIntensity: number;
  layers: LayerFormData[];
  oneShots: SfxFormData[];
  weatherSystems: WeatherFormData[];
  moodStates: MoodFormData[];
}

const packData = ref<PackFormData>({
  id: '',
  name: '',
  description: '',
  category: 'fantasy',
  defaultIntensity: 50,
  layers: [],
  oneShots: [],
  weatherSystems: [],
  moodStates: [
    { state: 'explore', name: 'Explore', icon: '🔍', musicFile: '' },
    { state: 'combat', name: 'Combat', icon: '⚔️', musicFile: '' },
    { state: 'victory', name: 'Victory', icon: '🏆', musicFile: '' },
    { state: 'rest', name: 'Rest', icon: '🔥', musicFile: '' },
  ],
});

const categoryOptions = [
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Sci-Fi', value: 'scifi' },
  { label: 'Horror', value: 'horror' },
  { label: 'Modern', value: 'modern' },
  { label: 'Custom', value: 'custom' },
];

const sfxCategoryOptions = [
  { label: 'Combat', value: 'combat' },
  { label: 'Exploration', value: 'exploration' },
  { label: 'Environmental', value: 'environmental' },
  { label: 'Weather', value: 'weather' },
];

const isValid = computed(() => {
  return packData.value.name.trim().length > 0;
});

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

async function pickLayerFile(index: number) {
  if (!fileHandler.isSupported()) {
    console.warn('File System API not supported');
    return;
  }
  const files = await fileHandler.pickAudioFiles();
  if (files.length > 0) {
    const file = files[0].file;
    packData.value.layers[index].fileHandle =
      files[0].source.kind === 'handle'
        ? (files[0].source as any).handle
        : undefined;
    packData.value.layers[index].fileBlob =
      files[0].source.kind === 'blob'
        ? (files[0].source as any).blob
        : undefined;
    packData.value.layers[index].file = `layers/${file.name}`;
  }
}

async function pickSfxFile(index: number) {
  if (!fileHandler.isSupported()) {
    console.warn('File System API not supported');
    return;
  }
  const files = await fileHandler.pickAudioFiles();
  if (files.length > 0) {
    const file = files[0].file;
    packData.value.oneShots[index].fileHandle =
      files[0].source.kind === 'handle'
        ? (files[0].source as any).handle
        : undefined;
    packData.value.oneShots[index].fileBlob =
      files[0].source.kind === 'blob'
        ? (files[0].source as any).blob
        : undefined;
    packData.value.oneShots[index].file = `sfx/${file.name}`;
  }
}

async function pickWeatherFile(index: number) {
  if (!fileHandler.isSupported()) {
    console.warn('File System API not supported');
    return;
  }
  const files = await fileHandler.pickAudioFiles();
  if (files.length > 0) {
    const file = files[0].file;
    packData.value.weatherSystems[index].fileHandle =
      files[0].source.kind === 'handle'
        ? (files[0].source as any).handle
        : undefined;
    packData.value.weatherSystems[index].fileBlob =
      files[0].source.kind === 'blob'
        ? (files[0].source as any).blob
        : undefined;
    packData.value.weatherSystems[index].file = `weather/${file.name}`;
  }
}

async function pickMusicFile(moodState: string) {
  if (!fileHandler.isSupported()) {
    console.warn('File System API not supported');
    return;
  }
  const files = await fileHandler.pickAudioFiles();
  if (files.length > 0) {
    const file = files[0].file;
    const mood = packData.value.moodStates.find((m) => m.state === moodState);
    if (mood) {
      mood.musicFileHandle =
        files[0].source.kind === 'handle'
          ? (files[0].source as any).handle
          : undefined;
      mood.musicFileBlob =
        files[0].source.kind === 'blob'
          ? (files[0].source as any).blob
          : undefined;
      mood.musicFile = `music/${file.name}`;
    }
  }
}

function addLayer() {
  packData.value.layers.push({
    id: `layer_${Date.now()}`,
    name: '',
    icon: '🔊',
    file: '',
    defaultVolume: 50,
    loop: true,
  });
}

function removeLayer(index: number) {
  packData.value.layers.splice(index, 1);
}

function addOneShot() {
  packData.value.oneShots.push({
    id: `sfx_${Date.now()}`,
    name: '',
    icon: '🔔',
    file: '',
    category: 'exploration',
    volume: 80,
  });
}

function removeOneShot(index: number) {
  packData.value.oneShots.splice(index, 1);
}

function addWeather() {
  packData.value.weatherSystems.push({
    id: `weather_${Date.now()}`,
    name: '',
    icon: '🌧️',
    file: '',
    affectsLayers: [],
  });
}

function removeWeather(index: number) {
  packData.value.weatherSystems.splice(index, 1);
}

function goBack() {
  router.push('/ambient-sound');
}

async function savePack() {
  const audioFiles: Map<string, Blob> = new Map();

  for (const layer of packData.value.layers) {
    if (layer.fileBlob) {
      const fileName = layer.file?.split('/').pop() || `${layer.id}.mp3`;
      audioFiles.set(`layers/${fileName}`, layer.fileBlob);
    } else if (layer.fileHandle) {
      const file = await layer.fileHandle.getFile();
      audioFiles.set(`layers/${file.name}`, file);
    }
  }

  for (const sfx of packData.value.oneShots) {
    if (sfx.fileBlob) {
      const fileName = sfx.file?.split('/').pop() || `${sfx.id}.mp3`;
      audioFiles.set(`sfx/${fileName}`, sfx.fileBlob);
    } else if (sfx.fileHandle) {
      const file = await sfx.fileHandle.getFile();
      audioFiles.set(`sfx/${file.name}`, file);
    }
  }

  for (const weather of packData.value.weatherSystems) {
    if (weather.fileBlob) {
      const fileName = weather.file?.split('/').pop() || `${weather.id}.mp3`;
      audioFiles.set(`weather/${fileName}`, weather.fileBlob);
    } else if (weather.fileHandle) {
      const file = await weather.fileHandle.getFile();
      audioFiles.set(`weather/${file.name}`, file);
    }
  }

  for (const mood of packData.value.moodStates) {
    if (mood.musicFileBlob) {
      const fileName = mood.musicFile?.split('/').pop() || `${mood.state}.mp3`;
      audioFiles.set(`music/${fileName}`, mood.musicFileBlob);
    } else if (mood.musicFileHandle) {
      const file = await mood.musicFileHandle.getFile();
      if (mood.musicFile) {
        audioFiles.set(`music/${file.name}`, file);
      }
    }
  }

  const packId = packData.value.id || `pack_${Date.now()}`;

  const cleanLayers: LayerDef[] = packData.value.layers.map((l) => ({
    id: l.id,
    name: l.name,
    icon: l.icon,
    file: l.file,
    defaultVolume: l.defaultVolume,
    loop: l.loop,
  }));

  const cleanOneShots: OneShotDef[] = packData.value.oneShots.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    file: s.file,
    category: s.category,
    volume: s.volume,
  }));

  const cleanWeather: WeatherDef[] = packData.value.weatherSystems.map((w) => ({
    id: w.id,
    name: w.name,
    icon: w.icon,
    file: w.file,
    affectsLayers: w.affectsLayers,
  }));

  const cleanMoodStates: MoodStateDef[] = packData.value.moodStates.map(
    (m) => ({
      state: m.state as 'explore' | 'combat' | 'victory' | 'rest',
      name: m.name,
      icon: m.icon,
      musicFile: m.musicFile,
    }),
  );

  const manifest: SoundPackManifest = {
    version: '1.0',
    id: packId,
    name: packData.value.name,
    description: packData.value.description,
    category: packData.value.category,
    defaultIntensity: packData.value.defaultIntensity,
    layers: cleanLayers,
    oneShots: cleanOneShots,
    weatherSystems: cleanWeather,
    moodStates: cleanMoodStates,
  };

  await saveSoundPack(manifest, audioFiles);
  console.log('Pack saved to IndexedDB:', manifest.id);

  await showDownloadOption(manifest.id);
}

async function showDownloadOption(packId: string) {
  const download = await confirm(t('ambientSoundPage.downloadPrompt'));
  if (download) {
    downloadPack(packId);
  } else {
    router.push('/ambient-sound');
  }
}

async function downloadPack(packId: string) {
  try {
    await exportSoundPackAsFile(packId);
    router.push('/ambient-sound');
  } catch (error) {
    console.error('Failed to download pack:', error);
  }
}
</script>

<style scoped>
.pack-editor-page {
  padding: 16px;
  max-width: 900px;
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
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.editor-section {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
}

.editor-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
}

.editor-section .QInput,
.editor-section .QSelect {
  margin-bottom: 12px;
}

.intensity-input {
  margin-top: 8px;
}

.intensity-input span {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  gap: 8px;
  align-items: center;
  background: white;
  padding: 8px;
  border-radius: 4px;
}

.item-fields {
  display: flex;
  gap: 8px;
  flex: 1;
}

.item-fields .QInput,
.item-fields .QSelect {
  margin: 0;
}

.item-file {
  min-width: 120px;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 16px;
}

.mood-states-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.mood-state-card {
  background: white;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mood-state-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mood-icon {
  font-size: 24px;
}
</style>
