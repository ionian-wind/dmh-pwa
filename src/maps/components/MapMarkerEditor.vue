<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type {
  MapEntityKind,
  MapEntityRef,
  MapLayer,
  MapLocation,
  MapMarker,
} from '../types';
import { normalizeMarker } from '../utils/normalize';
import { MAP_MARKER_ICONS } from '../icons';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';

const props = defineProps<{
  isOpen: boolean;
  marker: MapMarker | null;
  locations: MapLocation[];
  layers: MapLayer[];
}>();

const emit = defineEmits<{
  (e: 'save', marker: MapMarker): void;
  (e: 'delete', markerId: string): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const draft = ref<MapMarker>(normalizeMarker());
const isNew = ref(true);

const layerOptions = computed(() =>
  props.layers.map((layer) => ({ label: layer.title, value: layer.id })),
);

watch(
  () => props.marker,
  (marker) => {
    draft.value = normalizeMarker(marker ?? {});
    isNew.value = !marker?.id;
  },
  { immediate: true, deep: true },
);

const editorTabs = useEntityEditorTabs();
const linkKinds: MapEntityKind[] = [
  'note',
  'module',
  'monster',
  'encounter',
  'character',
];

const linkedLocation = computed<MapEntityRef[]>(() =>
  draft.value.locationId
    ? [{ kind: 'location', id: draft.value.locationId }]
    : [],
);

function setLinkedLocation(links: MapEntityRef[]) {
  draft.value.locationId = links[0]?.id ?? null;
}

function setMarkerLinks(links: MapEntityRef[]) {
  draft.value.entities = links;
}

function submit() {
  if (!draft.value.title.trim()) {
    alert(t('maps.markerTitleRequired'));
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
    :title="isNew ? t('maps.addMarker') : t('maps.editMarker')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!isNew"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="map-marker-editor-modal"
    @submit="submit"
    @delete="remove"
    @cancel="emit('cancel')"
  >
    <template #main>
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <QInput
              id="marker-title"
              v-model="draft.title"
              :label="t('maps.markerTitle')"
              type="text"
              outlined
              required
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <QSelect
          v-model="draft.layerId"
          :options="layerOptions"
          :label="t('maps.layer')"
          outlined
          emit-value
          map-options
        />
      </div>

      <div class="form-section">
        <div class="form-group">
          <QInput
            id="marker-description"
            v-model="draft.description"
            :label="t('maps.markerDescription')"
            type="textarea"
            :rows="3"
            autogrow
            outlined
          />
        </div>
      </div>

      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <ColorPicker
              id="marker-color"
              v-model="draft.color"
              :label="t('maps.markerColor')"
            />
          </div>
          <div class="form-group">
            <ColorPicker
              id="marker-background-color"
              v-model="draft.backgroundColor"
              :label="t('maps.markerBackgroundColor')"
              clearable
              :clear-label="t('maps.transparent')"
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <label>{{ t('maps.markerIcon') }}</label>
        <IconPicker
          v-model="draft.icon"
          :icons="MAP_MARKER_ICONS"
          collection="ra"
          :search-placeholder="t('maps.searchIcons')"
          :no-icon-label="t('maps.noIcon')"
        />
      </div>
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          kind="location"
          :multiple="false"
          :model-value="linkedLocation"
          @update:model-value="setLinkedLocation"
        />
        <EntitiesLinking
          v-for="kind in linkKinds"
          :key="kind"
          :kind="kind"
          :model-value="draft.entities"
          @update:model-value="setMarkerLinks"
        />
      </div>
    </template>
  </BaseModal>
</template>
