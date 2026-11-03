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

      <template #ambiences>
        <div class="section-header">
          <div class="text-subtitle1 text-weight-medium">
            {{ t('ambientSoundPage.ambiences') }}
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

interface PackFormData {
  id: string;
  name: string;
  description: string;
  category: SoundPackManifest['category'];
  defaultIntensity: number;
  layers: LayerFormData[];
  oneShots: OneShotFormData[];
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
});

const editorTabs = computed(() => [
  { name: 'main', label: t('ambientSoundPage.packInfo') },
  { name: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { name: 'oneShots', label: t('ambientSoundPage.oneShots') },
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
        await collectAudio(audioFiles, 'ambiences', sample);
      }
    }
  }
  for (const sfx of packData.value.oneShots) {
    if (sfx.file) await collectAudio(audioFiles, 'one-shots', sfx);
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
      samples: variation.samples.map((sample) => `ambiences/${sample.file}`),
    })),
  }));

  const oneShots: OneShotDef[] = packData.value.oneShots.map((sfx) => ({
    id: sfx.id,
    name: sfx.name,
    icon: sfx.icon,
    file: sfx.file ? `one-shots/${sfx.file}` : '',
    category: sfx.category,
    volume: sfx.volume,
  }));

  const manifest: SoundPackManifest = {
    version: '2.0',
    id: packId,
    name: packData.value.name,
    description: packData.value.description,
    category: packData.value.category,
    defaultIntensity: packData.value.defaultIntensity,
    ambiences: layers,
    oneShots,
    scenes: [],
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
</style>
