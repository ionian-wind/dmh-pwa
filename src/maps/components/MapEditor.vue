<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import type { MapEntity } from '../types';
import { putMapFile, getMapFile } from '../maps';
import { createMapFileFromHandle } from '../utils/mapFileUtils';

const props = defineProps<{
  map: MapEntity | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', map: Omit<MapEntity, 'id' | 'createdAt' | 'updatedAt'>): void;
  (e: 'cancel'): void;
}>();

type MapForm = Omit<MapEntity, 'id' | 'createdAt' | 'updatedAt'>;

const editedMap = ref<MapForm>({
  title: '',
  description: '',
  fileId: '',
  points: [],
});

const selectedFileName = ref<string>('');
const { t } = useI18n();

// Track the original fileId and the current file handle
let originalFileId: string | null = null;
let currentFileHandle: FileSystemFileHandle | null = null;
let currentMapFile: any = null;

watch(() => props.map, async (newMap) => {
  if (newMap) {
    const { id, createdAt, updatedAt, ...mapData } = newMap;
    editedMap.value = { ...mapData };
    selectedFileName.value = '';
    originalFileId = mapData.fileId || '';
    currentFileHandle = null;
    currentMapFile = null;
    if (mapData.fileId) {
      const file = await getMapFile(mapData.fileId);
      selectedFileName.value = file?.name || '';
    }
  } else {
    editedMap.value = {
      title: '',
      description: '',
      fileId: '',
      points: [],
    };
    selectedFileName.value = '';
    originalFileId = '';
    currentFileHandle = null;
    currentMapFile = null;
  }
}, { immediate: true });

async function pickImageFile() {
  // Only works in Chromium browsers
  // @ts-ignore
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: t('maps.imageFiles'),
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'] },
      },
    ],
    excludeAcceptAllOption: true,
  });
  if (handle) {
    try {
      const mapFile = await createMapFileFromHandle(handle);
      currentMapFile = mapFile;
      editedMap.value.fileId = mapFile.id;
      selectedFileName.value = mapFile.name;
      currentFileHandle = handle;
    } catch (error) {
      console.error('Failed to process image file:', error);
      alert(t('maps.imageProcessingError'));
    }
  }
}

const handleSubmit = async () => {
  if (!editedMap.value.title) {
    alert(t('maps.titleRequired'));
    return;
  }
  if (!editedMap.value.fileId) {
    alert(t('maps.imageRequired'));
    return;
  }
  // Only save the file if fileId changed and we have a new mapFile
  if (editedMap.value.fileId !== originalFileId && currentMapFile) {
    await putMapFile(currentMapFile);
  }
  emit('submit', {
    ...editedMap.value,
    // TODO: Points editing/validation
  });
};

const handleCancel = () => {
  emit('cancel');
};
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
    @cancel="handleCancel"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('maps.title')"
            id="map-title"
            v-model="editedMap.title"
            type="text"
            required
            outlined
          />
        </div>
        <div class="form-group">
          <label>{{ t('maps.image') }}</label>
          <QBtn flat @click="pickImageFile">
            {{ t('maps.selectFile') }}
          </QBtn>
          <span v-if="editedMap.fileId" class="selected-file">{{ selectedFileName }}</span>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('maps.description')"
            id="map-description"
            v-model="editedMap.description"
            type="textarea"
            :rows="5"
            autogrow
            outlined
          />
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>{{ t('maps.points') }}</h3>
      <!-- TODO: Implement points editing UI -->
      <div class="form-group">
        <span>{{ t('maps.pointsPlaceholder') }}</span>
      </div>
    </div>
  </BaseModal>
</template>
