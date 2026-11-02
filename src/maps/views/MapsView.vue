<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMapStore, deleteMapFile } from '../maps';
import { useMapLocationStore } from '../locations';
import BaseListView from '@/components/common/BaseListView.vue';
import MapCard from '../components/MapCard.vue';
import MapEditor from '../components/MapEditor.vue';
import LocationsListView from './LocationsListView.vue';
import type { MapEntity, MapEntityForm } from '../types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';
import { normalizeMapEntity } from '../utils/normalize';

const mapStore = useMapStore();
const locationStore = useMapLocationStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const activeTab = ref(route.query.tab === 'locations' ? 'locations' : 'maps');

onMounted(async () => {
  await Promise.all([mapStore.load(), locationStore.load()]);
});

function cardProps(map: MapEntity) {
  return {
    map,
    linkedLocation: map.locationId
      ? (locationStore.getById(map.locationId) ?? null)
      : null,
    onView: () => router.push(`/maps/${map.id}`),
    onEdit: () => handleEdit(map),
    onDelete: () => handleDelete(map),
    onOpenLocation: (locationId: string) =>
      router.push(`/locations/${locationId}`),
  };
}

function editorProps(map: MapEntity | null) {
  return {
    map,
    isOpen: true,
  };
}

function handleEdit(_map: MapEntity) {
  // handled by BaseListView
}

async function handleDelete(map: MapEntity) {
  if (
    !map.id ||
    !(await confirm(t('maps.confirmDelete', { title: map.title })))
  ) {
    return false;
  }

  await mapStore.remove(map.id);
  if (map.fileId) {
    await deleteMapFile(map.fileId).catch(() => undefined);
  }
  return true;
}

async function unlinkOtherMaps(
  locationId: string | null | undefined,
  keepId?: string,
) {
  if (!locationId) return;
  const others = mapStore.items.filter(
    (map) => map.id !== keepId && map.locationId === locationId,
  );
  await Promise.all(
    others.map((map) => mapStore.update(map.id, { locationId: null })),
  );
}

async function handleSubmit(form: MapEntityForm) {
  if (form.id) {
    await unlinkOtherMaps(form.locationId, form.id);
    await mapStore.update(form.id, form);
  } else {
    await unlinkOtherMaps(form.locationId);
    const created = await mapStore.create(normalizeMapEntity(form));
    await router.push(`/maps/${created.id}`);
  }
}
</script>

<template>
  <div>
    <QTabs
      v-model="activeTab"
      dense
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="q-px-lg q-pt-md"
    >
      <QTab name="maps" :label="t('maps.title')" />
      <QTab name="locations" :label="t('maps.locations')" />
    </QTabs>

    <BaseListView
      v-if="activeTab === 'maps'"
      :items="mapStore.filtered"
      :card-component="MapCard"
      :editor-component="MapEditor"
      :empty-message="t('maps.empty')"
      :create-title="t('maps.create')"
      :card-props="cardProps"
      :editor-props="editorProps"
      @delete="handleDelete"
      @submit="handleSubmit"
      @view="(map: MapEntity) => router.push(`/maps/${map.id}`)"
    />
    <LocationsListView v-else />
  </div>
</template>
