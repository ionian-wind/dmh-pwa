<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import { confirm } from '@/dialogs';
import LocationEntityLinksTab from '../components/LocationEntityLinksTab.vue';
import MapLocationEditor from '../components/MapLocationEditor.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { useMapStore } from '../maps';
import { useMapEntityCatalog } from '../composables/useMapEntityCatalog';
import type { MapEntityKind, MapEntityRef } from '../types';
import { dedupeEntityRefs } from '../utils/entityRefs';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const locationStore = useMapLocationStore();
const mapStore = useMapStore();
const { groups } = useMapEntityCatalog();

const location = computed(() =>
  locationStore.getById(String(route.params.id ?? '')),
);
const loading = computed(() => !locationStore.isLoaded);
const notFound = computed(() => locationStore.isLoaded && !location.value);

const linkableGroups = computed(() =>
  groups.value.filter((group) => group.kind !== 'map'),
);

const entityTabs = computed(() =>
  linkableGroups.value.map((group) => ({
    id: group.kind,
    label: t(group.labelKey),
    badge: linksFor(group.kind).length || undefined,
  })),
);

const linkedMaps = computed(() =>
  mapStore.items.filter((map) =>
    map.locationIds.includes(location.value?.id ?? ''),
  ),
);

const showEditor = ref(false);
const activeTab = ref('note');

onMounted(async () => {
  await Promise.all([locationStore.load(), mapStore.load()]);
});

function linksFor(kind: MapEntityKind) {
  return (location.value?.entities ?? []).filter(
    (entity) => entity.kind === kind,
  );
}

function optionsFor(kind: MapEntityKind) {
  return groups.value.find((group) => group.kind === kind)?.items ?? [];
}

async function updateLinks(entities: MapEntityRef[]) {
  if (!location.value) return;
  await locationStore.update(location.value.id, {
    entities: dedupeEntityRefs(entities),
  });
}

function addLink(ref: MapEntityRef) {
  if (!location.value) return;
  void updateLinks([...location.value.entities, ref]);
}

function removeLink(ref: MapEntityRef) {
  if (!location.value) return;
  void updateLinks(
    location.value.entities.filter(
      (entity) => !(entity.kind === ref.kind && entity.id === ref.id),
    ),
  );
}

async function handleDelete() {
  if (!location.value) return false;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: location.value.name || t('maps.untitledLocation'),
      }),
    ))
  ) {
    return false;
  }
  await deleteMapLocation(location.value.id);
  await router.push('/maps?tab=locations');
  return true;
}

function handleSubmit(updated: typeof location.value) {
  if (!updated) return;
  void locationStore.update(updated.id, {
    name: updated.name,
    description: updated.description,
    color: updated.color,
    entities: updated.entities,
  });
  showEditor.value = false;
}
</script>

<template>
  <BaseEntityTabView
    :entity="location"
    entity-name="maps.location"
    list-route="/maps?tab=locations"
    :on-delete="handleDelete"
    :on-edit="() => (showEditor = true)"
    :title="location?.name"
    :not-found="notFound"
    :loading="loading"
    :tabs="entityTabs"
    v-model="activeTab"
  >
    <template v-for="group in linkableGroups" :key="group.kind" #[group.kind]>
      <LocationEntityLinksTab
        :kind="group.kind"
        :links="linksFor(group.kind)"
        :options="optionsFor(group.kind)"
        @add="addLink"
        @remove="removeLink"
      />
    </template>

    <template #sidepanel>
      <div class="location-maps-panel">
        <h4>{{ t('maps.title') }}</h4>
        <p v-if="linkedMaps.length === 0" class="location-maps-empty">
          {{ t('maps.noLinkedMaps') }}
        </p>
        <button
          v-for="map in linkedMaps"
          :key="map.id"
          type="button"
          class="location-map-item"
          @click="router.push(`/maps/${map.id}`)"
        >
          {{ map.title }}
        </button>
      </div>
    </template>

    <template #editor>
      <MapLocationEditor
        :location="location || null"
        :is-open="showEditor"
        @save="handleSubmit"
        @cancel="showEditor = false"
      />
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
.location-maps-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
}

.location-maps-panel h4 {
  margin: 0;
}

.location-maps-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.location-map-item {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.location-map-item:hover {
  background: var(--color-background-soft);
}
</style>
