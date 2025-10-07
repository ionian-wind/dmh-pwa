<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMapStore, deleteMapFile } from '../maps';
import BaseListView from '@/components/common/BaseListView.vue';
import MapCard from '../components/MapCard.vue';
import MapEditor from '../components/MapEditor.vue';
import type { MapEntity, MapEntityForm } from '../types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';
import { normalizeMapEntity } from '../utils/normalize';

const mapStore = useMapStore();
const router = useRouter();
const { t } = useI18n();

onMounted(async () => {
  await mapStore.load();
});

function cardProps(map: MapEntity) {
  return {
    map,
    onView: () => router.push(`/maps/${map.id}`),
    onEdit: () => handleEdit(map),
    onDelete: () => handleDelete(map),
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

async function handleSubmit(form: MapEntityForm) {
  if (form.id) {
    await mapStore.update(form.id, form);
  } else {
    const created = await mapStore.create(normalizeMapEntity(form));
    await router.push(`/maps/${created.id}`);
  }
}
</script>

<template>
  <BaseListView
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
</template>
