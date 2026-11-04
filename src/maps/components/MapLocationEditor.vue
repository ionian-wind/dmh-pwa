<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type {
  MapEntityKind,
  MapEntityRef,
  MapFile,
  MapLocation,
} from '../types';
import { deepUnwrap } from '@/utils/deepUnwrap';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { createMapFileFromFile, getMapFileBlob } from '../utils/mapFileUtils';
import { deleteMapFile, getMapFile, putMapFile } from '../maps';
import { normalizeLocation, normalizeLocationMap } from '../utils/normalize';

const props = defineProps<{
  location: MapLocation | null;
  isOpen: boolean;
  useModalStack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', location: MapLocation): void;
  (e: 'submit', location: MapLocation): void;
  (e: 'delete', locationId: string): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const draft = ref<MapLocation>(createLocation());
const isNew = ref(true);
const selectedFileName = ref('');
const previewUrl = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const isProcessingImage = ref(false);

let originalFileId: string | null = null;
let pendingMapFile: MapFile | null = null;

function createLocation(): MapLocation {
  return normalizeLocation({ name: '', description: '', entities: [] });
}

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
  () => props.location,
  (location) => {
    revokePreview();
    pendingMapFile = null;
    draft.value = location
      ? normalizeLocation(deepUnwrap(location) as MapLocation)
      : createLocation();
    isNew.value = !location;
    originalFileId = draft.value.map.fileId || null;
    if (draft.value.map.fileId) void loadPreview(draft.value.map.fileId);
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(revokePreview);

const editorTabs = useEntityEditorTabs();
const linkKinds: MapEntityKind[] = [
  'note',
  'module',
  'party',
  'monster',
  'encounter',
  'character',
  'playlist',
];

function setLinks(links: MapEntityRef[]) {
  draft.value.entities = links;
}

function chooseImage() {
  fileInput.value?.click();
}

function clearMap() {
  revokePreview();
  selectedFileName.value = '';
  pendingMapFile = null;
  draft.value.map = normalizeLocationMap();
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
    draft.value.map.fileId = mapFile.id;
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

async function submit() {
  if (!draft.value.name.trim()) {
    alert(t('maps.locationNameRequired'));
    return;
  }

  if (draft.value.map.fileId !== originalFileId) {
    if (pendingMapFile) {
      await putMapFile(pendingMapFile);
    }
    if (originalFileId) {
      await deleteMapFile(originalFileId);
    }
  }

  const location = {
    ...draft.value,
    name: draft.value.name.trim(),
    map: normalizeLocationMap(draft.value.map),
  };
  emit('save', location);
  emit('submit', location);
}

function remove() {
  if (props.location) emit('delete', props.location.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isNew ? t('maps.addLocation') : t('maps.editLocation')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!isNew"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="map-location-editor-modal"
    @submit="submit"
    @delete="remove"
    @cancel="emit('cancel')"
  >
    <template #main>
      <div class="form-section">
        <QInput
          id="location-name"
          v-model="draft.name"
          :label="t('maps.locationName')"
          type="text"
          outlined
          required
        />
      </div>

      <div class="form-section">
        <div class="form-group">
          <QInput
            id="location-description"
            v-model="draft.description"
            :label="t('maps.locationDescription')"
            type="textarea"
            :rows="3"
            autogrow
            outlined
          />
        </div>
      </div>

      <div class="form-section">
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
            <QBtn
              v-if="draft.map.fileId"
              flat
              color="negative"
              :label="t('maps.clearMap')"
              @click="clearMap"
            />
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
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          v-for="kind in linkKinds"
          :key="kind"
          :kind="kind"
          :model-value="draft.entities"
          @update:model-value="setLinks"
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
