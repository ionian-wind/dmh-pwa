<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityLinksEditor from './EntityLinksEditor.vue';
import type { MapEntityRef, MapLocation } from '../types';
import { generateId } from '@/utils/storage';
import { deepUnwrap } from '@/utils/deepUnwrap';

const props = defineProps<{
  location: MapLocation | null;
  isOpen: boolean;
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

function createLocation(): MapLocation {
  const now = Date.now();
  return {
    id: generateId(),
    name: '',
    description: '',
    entities: [],
    createdAt: now,
    updatedAt: now,
  };
}

watch(
  () => props.location,
  (location) => {
    draft.value = location
      ? (deepUnwrap(location) as MapLocation)
      : createLocation();
    isNew.value = !location;
  },
  { immediate: true, deep: true },
);

function setLocationLinks(links: MapEntityRef[]) {
  draft.value.entities = links;
}

function submit() {
  if (!draft.value.name.trim()) {
    alert(t('maps.locationNameRequired'));
    return;
  }
  const location = { ...draft.value, name: draft.value.name.trim() };
  emit('save', location);
  emit('submit', location);
}

function remove() {
  if (props.location) emit('delete', props.location.id);
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isNew ? t('maps.addLocation') : t('maps.editLocation')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="map-location-editor-modal"
    @submit="submit"
    @cancel="emit('cancel')"
  >
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
      <label>{{ t('maps.linkedEntities') }}</label>
      <EntityLinksEditor
        :model-value="draft.entities"
        @update:model-value="setLocationLinks"
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
