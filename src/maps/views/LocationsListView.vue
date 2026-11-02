<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseListView from '@/components/common/BaseListView.vue';
import { confirm } from '@/dialogs';
import LocationCard from '../components/LocationCard.vue';
import MapLocationEditor from '../components/MapLocationEditor.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { useMapStore } from '../maps';
import type { MapLocation } from '../types';

const router = useRouter();
const { t } = useI18n();
const locationStore = useMapLocationStore();
const mapStore = useMapStore();

onMounted(async () => {
  await Promise.all([locationStore.load(), mapStore.load()]);
});

function cardProps(location: MapLocation) {
  return {
    location,
    linkedMap:
      mapStore.items.find((map) => map.locationId === location.id) ?? null,
    onView: () => router.push(`/locations/${location.id}`),
    onEdit: () => undefined,
    onDelete: () => handleDelete(location),
    onOpenMap: (mapId: string) => router.push(`/maps/${mapId}`),
  };
}

function editorProps(location: MapLocation | null) {
  return {
    location,
    isOpen: true,
  };
}

async function handleDelete(location: MapLocation) {
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: location.name || t('maps.untitledLocation'),
      }),
    ))
  ) {
    return false;
  }
  await deleteMapLocation(location.id);
  return true;
}

async function handleSubmit(location: MapLocation) {
  if (locationStore.getById(location.id)) {
    await locationStore.update(location.id, {
      name: location.name,
      description: location.description,
      entities: location.entities,
    });
  } else {
    await locationStore.create({
      name: location.name,
      description: location.description,
      entities: location.entities,
    });
  }
}
</script>

<template>
  <BaseListView
    :items="locationStore.filtered"
    :card-component="LocationCard"
    :editor-component="MapLocationEditor"
    :empty-message="t('maps.noLocations')"
    :create-title="t('maps.addLocation')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(location: MapLocation) => router.push(`/locations/${location.id}`)"
  />
</template>
