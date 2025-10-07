<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityLinksEditor from './EntityLinksEditor.vue';
import type { MapEntity, MapEntityForm, MapEntityRef, MapFile } from '../types';
import { createMapFileFromFile, getMapFileBlob } from '../utils/mapFileUtils';
import { deleteMapFile, getMapFile, putMapFile } from '../maps';
import { DEFAULT_MARKER_COLOR, normalizeMapEntity } from '../utils/normalize';
import { generateId } from '@/utils/storage';

const props = defineProps<{
  map: MapEntity | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', map: MapEntityForm): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const editedMap = ref<MapEntityForm>({
  title: '',
  description: '',
  fileId: '',
  locations: [],
  markers: [],
  areas: [],
});
const selectedFileName = ref('');
const previewUrl = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const isProcessingImage = ref(false);

let originalFileId: string | null = null;
let pendingMapFile: MapFile | null = null;
let editingId: string | undefined;

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}

async function loadPreview(fileId: string) {
  if (!fileId) return;
  try {
    const file = await getMapFile(fileId);
    if (!file) return;
    selectedFileName.value = file.name;
    const blob = await getMapFileBlob(file);
    previewUrl.value = URL.createObjectURL(blob);
  } catch {
    selectedFileName.value = '';
  }
}

watch(
  () => props.map,
  async (newMap) => {
    revokePreview();
    pendingMapFile = null;
    if (newMap) {
      const normalized = normalizeMapEntity(newMap);
      editingId = normalized.id;
      editedMap.value = {
        title: normalized.title,
        description: normalized.description,
        fileId: normalized.fileId,
        locations: structuredClone(normalized.locations),
        markers: structuredClone(normalized.markers),
        areas: structuredClone(normalized.areas),
      };
      originalFileId = normalized.fileId;
      await loadPreview(normalized.fileId);
    } else {
      editingId = undefined;
      editedMap.value = {
        title: '',
        description: '',
        fileId: '',
        locations: [],
        markers: [],
        areas: [],
      };
      selectedFileName.value = '';
      originalFileId = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(revokePreview);

function chooseImage() {
  fileInput.value?.click();
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert(t('maps.imageProcessingError'));
    input.value = '';
    return;
  }

  isProcessingImage.value = true;
  try {
    const mapFile = await createMapFileFromFile(file);
    pendingMapFile = mapFile;
    editedMap.value.fileId = mapFile.id;
    selectedFileName.value = mapFile.name;
    revokePreview();
    previewUrl.value = URL.createObjectURL(file);
  } catch {
    alert(t('maps.imageProcessingError'));
  } finally {
    isProcessingImage.value = false;
    input.value = '';
  }
}

function addLocation() {
  editedMap.value.locations.push({
    id: generateId(),
    name: '',
    description: '',
    color: DEFAULT_MARKER_COLOR,
    entities: [],
  });
}

function removeLocation(index: number) {
  editedMap.value.locations.splice(index, 1);
}

function setLocationLinks(index: number, links: MapEntityRef[]) {
  const location = editedMap.value.locations[index];
  if (location) location.entities = links;
}

async function handleSubmit() {
  if (!editedMap.value.title.trim()) {
    alert(t('maps.titleRequired'));
    return;
  }
  if (!editedMap.value.fileId) {
    alert(t('maps.imageRequired'));
    return;
  }

  if (editedMap.value.fileId !== originalFileId && pendingMapFile) {
    await putMapFile(pendingMapFile);
    if (originalFileId) {
      await deleteMapFile(originalFileId);
    }
  }

  emit('submit', {
    ...(editingId ? { id: editingId } : {}),
    ...editedMap.value,
    title: editedMap.value.title.trim(),
    locations: editedMap.value.locations.map((location) => ({
      ...location,
      name: location.name.trim(),
    })),
  });
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="map ? t('maps.edit') : t('maps.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="map-editor-modal"
    @submit="handleSubmit"
    @cancel="emit('cancel')"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            id="map-title"
            v-model="editedMap.title"
            :label="t('maps.title')"
            type="text"
            required
            outlined
          />
        </div>
        <div class="form-group map-image-field">
          <label>{{ t('maps.image') }}</label>
          <div class="map-image-row">
            <QBtn
              flat
              color="primary"
              :loading="isProcessingImage"
              :label="t('maps.selectFile')"
              @click="chooseImage"
            />
            <span v-if="selectedFileName" class="selected-file">
              {{ selectedFileName }}
            </span>
          </div>
          <input
            ref="fileInput"
            class="map-image-input"
            type="file"
            accept="image/*"
            @change="onImageSelected"
          />
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="t('maps.imagePreview')"
            class="map-image-preview"
          />
        </div>
      </div>
    </div>

    <div class="form-section">
      <QInput
        id="map-description"
        v-model="editedMap.description"
        :label="t('maps.description')"
        type="textarea"
        :rows="4"
        autogrow
        outlined
      />
    </div>

    <div class="form-section">
      <div class="map-section-header">
        <h3>{{ t('maps.locations') }}</h3>
        <QBtn
          flat
          color="primary"
          :label="t('maps.addLocation')"
          @click="addLocation"
        />
      </div>

      <p v-if="editedMap.locations.length === 0" class="map-section-empty">
        {{ t('maps.noLocations') }}
      </p>

      <div
        v-for="(location, index) in editedMap.locations"
        :key="location.id"
        class="map-location-editor"
      >
        <div class="form-grid">
          <div class="form-group">
            <QInput
              :id="`location-name-${index}`"
              v-model="location.name"
              :label="t('maps.locationName')"
              outlined
            />
          </div>
          <div class="form-group">
            <label :for="`location-color-${index}`">
              {{ t('maps.locationColor') }}
            </label>
            <input
              :id="`location-color-${index}`"
              v-model="location.color"
              type="color"
              class="marker-color-input"
            />
          </div>
        </div>
        <QInput
          :id="`location-description-${index}`"
          v-model="location.description"
          :label="t('maps.locationDescription')"
          type="textarea"
          :rows="2"
          autogrow
          outlined
        />
        <label>{{ t('maps.linkedEntities') }}</label>
        <EntityLinksEditor
          :model-value="location.entities"
          @update:model-value="(links) => setLocationLinks(index, links)"
        />
        <QBtn
          flat
          color="negative"
          :label="t('maps.removeLocation')"
          @click="removeLocation(index)"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.map-image-input {
  display: none;
}

.map-image-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.map-image-preview {
  max-width: 100%;
  max-height: 220px;
  margin-top: 0.5rem;
  border-radius: var(--border-radius-sm);
  object-fit: contain;
}

.map-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.map-section-empty {
  color: var(--color-text-light);
}

.map-location-editor {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem;
  margin-top: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

.marker-color-input {
  width: 48px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: transparent;
}
</style>
