<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import IconPicker from '@/components/common/IconPicker.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type {
  MapArea,
  MapEntityKind,
  MapEntityRef,
  MapLayer,
  MapLocation,
} from '../types';
import { normalizeArea } from '@/utils/maps/normalize';
import { MAP_MARKER_ICONS } from '@/utils/maps/icons';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';

const props = defineProps<{
  isOpen: boolean;
  area: MapArea | null;
  locations: MapLocation[];
  layers: MapLayer[];
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

const layerOptions = computed(() =>
  props.layers.map((layer) => ({ label: layer.title, value: layer.id })),
);

const editorTabs = useEntityEditorTabs();
const linkKinds: MapEntityKind[] = ['note', 'pawn', 'encounter', 'character'];

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
    :showDelete="!isNew"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="map-area-editor-modal"
    @submit="submit"
    @delete="remove"
    @cancel="emit('cancel')"
  >
    <template #main>
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
            <span class="text-caption text-grey-7 text-capitalize">
              {{ t(`maps.shapes.${draft.shape}`) }}
            </span>
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
