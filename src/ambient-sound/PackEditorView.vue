<template>
  <div class="pack-editor-page">
    <BaseModal
      :is-open="true"
      modal-id="ambient-pack-editor"
      :title="t('ambientSoundPage.createPack')"
      :show-submit="true"
      :show-cancel="true"
      :submit-label="t('common.save')"
      :cancel-label="t('common.cancel')"
      :tabs="editorTabs"
      @submit="savePack"
      @cancel="goBack"
    >
      <template #main>
        <div class="column q-gutter-md">
          <QInput
            v-model="packData.name"
            :label="t('notes.fields.title')"
            outlined
            dense
          />
          <QInput
            v-model="packData.description"
            :label="t('notes.fields.content')"
            type="textarea"
            outlined
            rows="3"
          />
          <QSelect
            v-model="packData.category"
            :options="categoryOptions"
            :label="t('ambientSoundPage.category')"
            outlined
            dense
          />
          <div>
            <div class="text-caption text-grey-7 q-mb-xs">
              {{ t('ambientSoundPage.intensity') }}:
              {{ packData.defaultIntensity }}%
            </div>
            <QSlider
              v-model="packData.defaultIntensity"
              :min="0"
              :max="100"
              color="primary"
            />
          </div>
        </div>
      </template>

      <template #layers>
        <div class="section-header">
          <div class="text-subtitle1 text-weight-medium">
            {{ t('ambientSoundPage.ambientLayers') }}
          </div>
          <QBtn
            flat
            size="sm"
            color="primary"
            :label="t('common.add')"
            @click="addLayer"
          />
        </div>

        <div class="items-list">
          <div
            v-for="layer in packData.layers"
            :key="layer.id"
            class="item-card column"
          >
            <div class="item-fields">
              <QInput
                v-model="layer.name"
                :label="t('ambientSoundPage.name')"
                dense
                outlined
              />
              <QInput
                v-model="layer.category"
                :label="t('ambientSoundPage.category')"
                dense
                outlined
              />
              <IconPicker
                v-model="layer.icon"
                :icons="MAP_MARKER_ICONS"
                collection="ra"
                :search-placeholder="t('ambientSoundPage.searchIcons')"
                :no-icon-label="t('ambientSoundPage.noIcon')"
              />
              <QInput
                v-model.number="layer.defaultVolume"
                type="number"
                :label="t('ambientSoundPage.volume')"
                dense
                outlined
                class="number-input"
              />
              <QBtn
                flat
                dense
                round
                color="negative"
                :title="t('common.delete')"
                :aria-label="t('common.delete')"
                @click="removeLayer(layer.id)"
              >
                <IconTrash :size="16" />
              </QBtn>
            </div>

            <div class="variations-list q-mt-sm">
              <div
                v-for="variation in layer.variations"
                :key="variation.id"
                class="variation-card"
              >
                <div class="item-fields">
                  <QInput
                    v-model="variation.name"
                    :label="t('ambientSoundPage.variation')"
                    dense
                    outlined
                  />
                  <QBtn
                    flat
                    dense
                    :label="t('ambientSoundPage.addSample')"
                    @click="addLayerSamples(layer, variation)"
                  />
                  <QBtn
                    flat
                    dense
                    round
                    color="negative"
                    :title="t('common.delete')"
                    :aria-label="t('common.delete')"
                    @click="removeVariation(layer, variation.id)"
                  >
                    <IconTrash :size="16" />
                  </QBtn>
                </div>
                <div
                  v-for="(sample, index) in variation.samples"
                  :key="`${sample.file}-${index}`"
                  class="sample-row"
                >
                  <span class="ellipsis">{{ sample.file }}</span>
                  <QBtn
                    flat
                    dense
                    round
                    color="negative"
                    :title="t('common.delete')"
                    :aria-label="t('common.delete')"
                    @click="removeSample(variation, index)"
                  >
                    <IconX :size="14" />
                  </QBtn>
                </div>
              </div>
              <QBtn
                flat
                dense
                :label="t('ambientSoundPage.addVariation')"
                @click="addVariation(layer)"
              />
            </div>
          </div>
          <div v-if="packData.layers.length === 0" class="empty-message">
            {{ t('ambientSoundPage.noLayers') }}
          </div>
        </div>
      </template>

      <template #oneShots>
        <div class="section-header">
          <div class="text-subtitle1 text-weight-medium">
            {{ t('ambientSoundPage.oneShots') }}
          </div>
          <QBtn
            flat
            size="sm"
            color="primary"
            :label="t('common.add')"
            @click="addOneShot"
          />
        </div>

        <div class="items-list">
          <div v-for="sfx in packData.oneShots" :key="sfx.id" class="item-card">
            <div class="item-fields">
              <QInput
                v-model="sfx.name"
                :label="t('ambientSoundPage.name')"
                dense
                outlined
              />
              <IconPicker
                v-model="sfx.icon"
                :icons="MAP_MARKER_ICONS"
                collection="ra"
                :search-placeholder="t('ambientSoundPage.searchIcons')"
                :no-icon-label="t('ambientSoundPage.noIcon')"
              />
              <QSelect
                v-model="sfx.category"
                :options="sfxCategoryOptions"
                :label="t('ambientSoundPage.category')"
                dense
                outlined
              />
              <QInput
                v-model.number="sfx.volume"
                type="number"
                :label="t('ambientSoundPage.volume')"
                dense
                outlined
                class="number-input"
              />
            </div>
            <div class="item-file">
              <QBtn
                flat
                size="sm"
                :label="sfx.file || t('ambientSoundPage.selectFile')"
                @click="pickOneShotFile(sfx)"
              />
            </div>
            <QBtn
              flat
              round
              size="sm"
              :title="t('common.delete')"
              :aria-label="t('common.delete')"
              @click="removeOneShot(sfx.id)"
            >
              <IconX :size="18" />
            </QBtn>
          </div>
        </div>
      </template>

      <template #moods>
        <div class="section-header">
          <div class="text-subtitle1 text-weight-medium">
            {{ t('ambientSoundPage.moodStates') }}
          </div>
        </div>

        <div class="mood-states-grid">
          <div
            v-for="mood in packData.moodStates"
            :key="mood.state"
            class="mood-state-card"
          >
            <div class="mood-state-header">
              <IconPicker
                v-model="mood.icon"
                :icons="MAP_MARKER_ICONS"
                collection="ra"
                :search-placeholder="t('ambientSoundPage.searchIcons')"
                :no-icon-label="t('ambientSoundPage.noIcon')"
              />
              <QInput v-model="mood.name" dense outlined />
              <QSelect
                v-model="mood.mode"
                :options="moodModeOptions"
                :label="t('ambientSoundPage.mode')"
                dense
                outlined
              />
            </div>
            <div
              v-for="(music, index) in mood.musicFiles"
              :key="`${music.file}-${index}`"
              class="sample-row"
            >
              <span class="ellipsis">{{ music.file }}</span>
              <QBtn
                flat
                dense
                round
                color="negative"
                :title="t('common.delete')"
                :aria-label="t('common.delete')"
                @click="removeMoodFile(mood, index)"
              >
                <IconX :size="14" />
              </QBtn>
            </div>
            <QBtn
              flat
              size="sm"
              :label="t('ambientSoundPage.addMusic')"
              @click="addMoodFiles(mood)"
            />
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconTrash, IconX } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import { MAP_MARKER_ICONS } from '@/maps/icons';
import { confirm } from '@/dialogs';
import { fileHandler } from '@/utils/files';
import {
  saveSoundPack,
  exportSoundPackAsFile,
} from '@/ambient-sound/utils/packManager';
import type {
  LayerDef,
  MoodMode,
  MoodState,
  MoodStateDef,
  OneShotDef,
  SoundPackManifest,
} from '@/ambient-sound/types';

interface FileForm {
  file: string;
  blob?: Blob;
  handle?: FileSystemFileHandle;
}

interface VariationForm {
  id: string;
  name: string;
  samples: FileForm[];
}

interface LayerFormData {
  id: string;
  name: string;
  icon: string;
  category: string;
  defaultVolume: number;
  loop: boolean;
  variations: VariationForm[];
}

interface OneShotFormData {
  id: string;
  name: string;
  icon: string;
  file: string;
  category: OneShotDef['category'];
  volume: number;
  blob?: Blob;
  handle?: FileSystemFileHandle;
}

interface MoodFormData {
  state: MoodState;
  name: string;
  icon: string;
  mode: MoodMode;
  musicFiles: FileForm[];
}

interface PackFormData {
  id: string;
  name: string;
  description: string;
  category: SoundPackManifest['category'];
  defaultIntensity: number;
  layers: LayerFormData[];
  oneShots: OneShotFormData[];
  moodStates: MoodFormData[];
}

const { t } = useI18n();
const router = useRouter();

const packData = ref<PackFormData>({
  id: '',
  name: '',
  description: '',
  category: 'fantasy',
  defaultIntensity: 50,
  layers: [],
  oneShots: [],
  moodStates: [
    {
      state: 'explore',
      name: 'Explore',
      icon: 'ra-horn-call',
      mode: 'continual',
      musicFiles: [],
    },
    {
      state: 'combat',
      name: 'Combat',
      icon: 'ra-crossed-swords',
      mode: 'continual',
      musicFiles: [],
    },
    {
      state: 'victory',
      name: 'Victory',
      icon: 'ra-trophy',
      mode: 'temporary',
      musicFiles: [],
    },
    {
      state: 'rest',
      name: 'Rest',
      icon: 'ra-campfire',
      mode: 'continual',
      musicFiles: [],
    },
  ],
});

const editorTabs = computed(() => [
  { name: 'main', label: t('ambientSoundPage.packInfo') },
  { name: 'layers', label: t('ambientSoundPage.ambientLayers') },
  { name: 'oneShots', label: t('ambientSoundPage.oneShots') },
  { name: 'moods', label: t('ambientSoundPage.moodStates') },
]);

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

const moodModeOptions = computed(() => [
  { label: t('ambientSoundPage.continual'), value: 'continual' },
  { label: t('ambientSoundPage.temporary'), value: 'temporary' },
]);

async function pickFiles(): Promise<FileForm[]> {
  if (!fileHandler.isSupported()) {
    console.warn('File System API not supported');
    return [];
  }
  const files = await fileHandler.pickAudioFiles();
  return files.map(({ file, source }) => ({
    file: file.name,
    blob: source.kind === 'blob' ? source.blob : undefined,
    handle: source.kind === 'handle' ? source.handle : undefined,
  }));
}

function addLayer() {
  packData.value.layers.push({
    id: `layer_${Date.now()}`,
    name: '',
    icon: 'ra-horn-call',
    category: 'Ambient',
    defaultVolume: 50,
    loop: true,
    variations: [
      {
        id: `variation_${Date.now()}`,
        name: t('ambientSoundPage.defaultVariation'),
        samples: [],
      },
    ],
  });
}

function removeLayer(layerId: string) {
  packData.value.layers = packData.value.layers.filter(
    (layer) => layer.id !== layerId,
  );
}

function addVariation(layer: LayerFormData) {
  layer.variations.push({
    id: `variation_${Date.now()}`,
    name: '',
    samples: [],
  });
}

function removeVariation(layer: LayerFormData, variationId: string) {
  layer.variations = layer.variations.filter(
    (variation) => variation.id !== variationId,
  );
}

async function addLayerSamples(layer: LayerFormData, variation: VariationForm) {
  const files = await pickFiles();
  variation.samples.push(...files);
}

function removeSample(variation: VariationForm, index: number) {
  variation.samples.splice(index, 1);
}

function addOneShot() {
  packData.value.oneShots.push({
    id: `sfx_${Date.now()}`,
    name: '',
    icon: 'ra-bell',
    file: '',
    category: 'exploration',
    volume: 80,
  });
}

function removeOneShot(sfxId: string) {
  packData.value.oneShots = packData.value.oneShots.filter(
    (sfx) => sfx.id !== sfxId,
  );
}

async function pickOneShotFile(sfx: OneShotFormData) {
  const [file] = await pickFiles();
  if (!file) return;
  sfx.file = file.file;
  sfx.blob = file.blob;
  sfx.handle = file.handle;
}

async function addMoodFiles(mood: MoodFormData) {
  const files = await pickFiles();
  mood.musicFiles.push(...files);
}

function removeMoodFile(mood: MoodFormData, index: number) {
  mood.musicFiles.splice(index, 1);
}

function goBack() {
  router.push('/ambient-sound');
}

async function collectAudio(
  audioFiles: Map<string, Blob>,
  folder: string,
  file: FileForm,
) {
  if (file.blob) {
    audioFiles.set(`${folder}/${file.file}`, file.blob);
    return;
  }
  if (file.handle) {
    const resolved = await file.handle.getFile();
    audioFiles.set(`${folder}/${file.file}`, resolved);
  }
}

async function savePack() {
  const audioFiles: Map<string, Blob> = new Map();

  for (const layer of packData.value.layers) {
    for (const variation of layer.variations) {
      for (const sample of variation.samples) {
        await collectAudio(audioFiles, 'layers', sample);
      }
    }
  }
  for (const sfx of packData.value.oneShots) {
    if (sfx.file) await collectAudio(audioFiles, 'sfx', sfx);
  }
  for (const mood of packData.value.moodStates) {
    for (const music of mood.musicFiles) {
      await collectAudio(audioFiles, 'music', music);
    }
  }

  const packId = packData.value.id || `pack_${Date.now()}`;

  const layers: LayerDef[] = packData.value.layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    icon: layer.icon,
    category: layer.category,
    defaultVolume: layer.defaultVolume,
    loop: layer.loop,
    variations: layer.variations.map((variation) => ({
      id: variation.id,
      name: variation.name,
      samples: variation.samples.map((sample) => sample.file),
    })),
  }));

  const oneShots: OneShotDef[] = packData.value.oneShots.map((sfx) => ({
    id: sfx.id,
    name: sfx.name,
    icon: sfx.icon,
    file: sfx.file,
    category: sfx.category,
    volume: sfx.volume,
  }));

  const moodStates: MoodStateDef[] = packData.value.moodStates.map((mood) => ({
    state: mood.state,
    name: mood.name,
    icon: mood.icon,
    mode: mood.mode,
    musicFiles: mood.musicFiles.map((music) => music.file),
  }));

  const manifest: SoundPackManifest = {
    version: '1.0',
    id: packId,
    name: packData.value.name,
    description: packData.value.description,
    category: packData.value.category,
    defaultIntensity: packData.value.defaultIntensity,
    layers,
    oneShots,
    moodStates,
  };

  await saveSoundPack(manifest, audioFiles);
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
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-card {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  border: 1px solid var(--color-border);
  padding: 0.5rem;
  border-radius: var(--border-radius);
}

.item-card.column {
  flex-direction: column;
  align-items: stretch;
}

.item-fields {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  align-items: center;
}

.item-fields > * {
  flex: 1;
  min-width: 0;
}

.item-fields .number-input {
  max-width: 96px;
}

.item-file {
  min-width: 120px;
}

.variations-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variation-card {
  border-left: 3px solid var(--color-border);
  padding-left: 0.5rem;
}

.sample-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--color-text-light);
  font-size: 0.8rem;
  padding: 0.15rem 0;
}

.empty-message {
  text-align: center;
  color: var(--color-text-light);
  padding: 1rem;
}

.mood-states-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.mood-state-card {
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mood-state-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
