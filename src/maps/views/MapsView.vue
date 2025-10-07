<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMapStore } from '../maps';
import BaseListView from '@/components/common/BaseListView.vue';
import MapCard from '../components/MapCard.vue';
import MapEditor from '../components/MapEditor.vue';
import type { MapEntity } from '../types';
import { useI18n } from 'vue-i18n';

const mapStore = useMapStore();
const router = useRouter();
const { t } = useI18n();

onMounted(async () => {
  await Promise.all([
    mapStore.load(),
  ]);
});

function cardProps(map: MapEntity) {
  return {
    map,
    onView: () => router.push(`/maps/${map.id}`),
    onEdit: () => handleEdit(map),
    onDelete: () => handleDelete(map)
  };
}

function editorProps(map: MapEntity | null) {
  return {
    map,
    isOpen: true
  };
}

function handleEdit(map: MapEntity) {
  // handled by BaseListView
}

function handleDelete(map: MapEntity) {
  if (map.id && confirm(t('maps.confirmDelete', { title: map.title }))) {
    mapStore.remove(map.id);
  }
}

function handleSubmit(map: MapEntity) {
  if (map.id) {
    mapStore.update(map.id, map);
  } else {
    mapStore.create(map);
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
    @view="(map) => router.push(`/maps/${map.id}`)"
  />
</template>
