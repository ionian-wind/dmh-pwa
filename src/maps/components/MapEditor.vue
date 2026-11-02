<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import type { MapEntity, MapEntityForm, MapFile } from '../types';
import type { MapEntityRef } from '../types';
import { createMapFileFromFile, getMapFileBlob } from '../utils/mapFileUtils';
import { deleteMapFile, getMapFile, putMapFile } from '../maps';
import { normalizeMapEntity } from '../utils/normalize';
import EntitiesLinking from './EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';

const props = defineProps<{
  map: MapEntity | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', map: MapEntityForm): void;
  (e: 'delete', mapId: string): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const editedMap = ref<MapEntityForm>({
  title: '',
  description: '',
  fileId: '',
  entities: [],
  locationId: null,
  layers: [],
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
  () => [props.isOpen, props.map?.id] as const,
  async ([isOpen]) => {
    if (!isOpen) return;
    revokePreview();
    pendingMapFile = null;
    const newMap = props.map;
    if (newMap) {
      const normalized = normalizeMapEntity(newMap);
      editingId = normalized.id;
      editedMap.value = {
        title: normalized.title,
        description: normalized.description,
        fileId: normalized.fileId,
        entities: structuredClone(normalized.entities),
        locationId: normalized.locationId ?? null,
        layers: structuredClone(normalized.layers),
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
        entities: [],
        locationId: null,
        layers: [],
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

const editorTabs = useEntityEditorTabs();

const linkedLocation = computed<MapEntityRef[]>(() =>
  editedMap.value.locationId
    ? [{ kind: 'location', id: editedMap.value.locationId }]
    : [],
);

function setLinkedModules(links: MapEntityRef[]) {
  editedMap.value.entities = links;
}

function setLinkedLocation(links: MapEntityRef[]) {
  editedMap.value.locationId = links[0]?.id ?? null;
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
    locationId: editedMap.value.locationId || null,
  });
}

function handleDelete() {
  if (props.map) emit('delete', props.map.id);
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="map ? t('maps.edit') : t('maps.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!map"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="map-editor-modal"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="emit('cancel')"
  >
    <template #main>
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
            <div class="row items-center q-gutter-sm">
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
              class="hidden"
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
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          kind="module"
          :model-value="editedMap.entities"
          @update:model-value="setLinkedModules"
        />
        <EntitiesLinking
          kind="location"
          :multiple="false"
          :model-value="linkedLocation"
          @update:model-value="setLinkedLocation"
        />
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.map-image-preview {
  max-width: 100%;
  max-height: 220px;
  margin-top: 0.5rem;
  border-radius: var(--border-radius-sm);
  object-fit: contain;
}
</style>
