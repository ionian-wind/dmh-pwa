<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import EntityLinksEditor from './EntityLinksEditor.vue';
import type { MapArea, MapEntityRef } from '../types';
import { normalizeArea } from '../utils/normalize';
import { MAP_MARKER_ICONS, markerIconClass } from '../icons';

const props = defineProps<{
  isOpen: boolean;
  area: MapArea | null;
  areas: MapArea[];
}>();

const emit = defineEmits<{
  (e: 'save', area: MapArea): void;
  (e: 'delete', areaId: string): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const draft = ref<MapArea>(normalizeArea());
const isNew = ref(true);

watch(
  () => props.area,
  (area) => {
    draft.value = normalizeArea(area ?? {});
    isNew.value = !area?.id;
  },
  { immediate: true, deep: true },
);

const linkedAreaOptions = computed(() =>
  props.areas
    .filter((area) => area.id !== draft.value.id)
    .map((area) => ({
      label: area.title || t('maps.untitledArea'),
      value: area.id,
    })),
);

function setMarkerLinks(links: MapEntityRef[]) {
  draft.value.entities = links;
}

function submit() {
  if (!draft.value.title.trim()) {
    alert(t('maps.areaTitleRequired'));
    return;
  }
  emit('save', { ...draft.value, title: draft.value.title.trim() });
}

function remove() {
  if (draft.value.id) emit('delete', draft.value.id);
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isNew ? t('maps.addArea') : t('maps.editArea')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="map-area-editor-modal"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            id="area-title"
            v-model="draft.title"
            :label="t('maps.areaTitle')"
            type="text"
            outlined
            required
          />
        </div>
        <div class="form-group">
          <span class="area-shape">
            {{ t(`maps.shapes.${draft.shape}`) }}
          </span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <QInput
        id="area-description"
        v-model="draft.description"
        :label="t('maps.areaDescription')"
        type="textarea"
        :rows="3"
        autogrow
        outlined
      />
    </div>

    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <ColorPicker
            id="area-color"
            v-model="draft.color"
            :label="t('maps.areaColor')"
          />
        </div>
        <div class="form-group">
          <span class="area-preview">
            <i
              v-if="draft.icon"
              :class="['ra', markerIconClass(draft.icon)]"
              :style="{ color: draft.color }"
              aria-hidden="true"
            ></i>
          </span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <label>{{ t('maps.areaIcon') }}</label>
      <IconPicker
        :model-value="draft.icon || ''"
        :icons="MAP_MARKER_ICONS"
        collection="ra"
        :search-placeholder="t('maps.searchIcons')"
        :no-icon-label="t('maps.noIcon')"
        @update:model-value="draft.icon = $event"
      />
    </div>

    <div class="form-section">
      <label>{{ t('maps.linkedEntities') }}</label>
      <EntityLinksEditor
        :model-value="draft.entities"
        @update:model-value="setMarkerLinks"
      />
    </div>

    <div class="form-section">
      <QSelect
        v-model="draft.linkedAreaIds"
        :options="linkedAreaOptions"
        :label="t('maps.linkedAreas')"
        outlined
        multiple
        emit-value
        map-options
      />
    </div>

    <template #actions>
      <QBtn
        v-if="!isNew"
        flat
        color="negative"
        :label="t('common.delete')"
        @click="remove"
      />
    </template>
  </BaseModal>
</template>

<style scoped>
.area-shape {
  color: var(--color-text-light);
  text-transform: capitalize;
}

.area-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 1.6rem;
}
</style>
