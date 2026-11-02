<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { confirm } from '@/dialogs';
import LocationEntityLinksTab from '../components/LocationEntityLinksTab.vue';
import MapLocationEditor from '../components/MapLocationEditor.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { useMapStore } from '../maps';
import { useMapEntityCatalog } from '../composables/useMapEntityCatalog';
import { markerIconClass } from '../icons';
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

const linkedMap = computed(
  () =>
    mapStore.items.find((map) => map.locationId === location.value?.id) ?? null,
);

const entityTabs = computed(() => {
  const tabs = linkableGroups.value.map((group) => ({
    id: group.kind,
    label: t(group.labelKey),
    badge: linksFor(group.kind).length || undefined,
  }));
  if (linkedMap.value) {
    tabs.unshift({ id: 'map', label: t('maps.mapTab'), badge: undefined });
  }
  return tabs;
});

const markerGroups = computed(() => {
  const locationId = location.value?.id;
  if (!locationId) return [];
  return mapStore.items
    .map((map) => ({
      map,
      markers: map.markers.filter((marker) => marker.locationId === locationId),
    }))
    .filter((group) => group.markers.length > 0);
});

const areaGroups = computed(() => {
  const locationId = location.value?.id;
  if (!locationId) return [];
  return mapStore.items
    .map((map) => ({
      map,
      areas: map.areas.filter((area) => area.locationId === locationId),
    }))
    .filter((group) => group.areas.length > 0);
});

const showEditor = ref(false);
const activeTab = ref('note');
const sidePanelTab = ref('markers');

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

function openMap(mapId: string) {
  void router.push(`/maps/${mapId}`);
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
    <template #map>
      <BaseCard
        v-if="linkedMap"
        showView
        :title="linkedMap.title"
        @view="openMap(linkedMap.id)"
      >
        <p v-if="linkedMap.description" class="location-map-description">
          {{ linkedMap.description }}
        </p>
      </BaseCard>
    </template>

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
      <TabGroup
        v-model="sidePanelTab"
        :tabs="[
          { id: 'markers', label: 'maps.markers' },
          { id: 'areas', label: 'maps.areas' },
        ]"
        size="sm"
        align="justify"
      >
        <div v-show="sidePanelTab === 'markers'" class="location-linked-panel">
          <p v-if="markerGroups.length === 0" class="location-linked-empty">
            {{ t('maps.noMarkers') }}
          </p>
          <div
            v-for="(group, index) in markerGroups"
            :key="group.map.id"
            class="location-linked-group"
          >
            <h5 class="location-linked-group-title">{{ group.map.title }}</h5>
            <button
              v-for="marker in group.markers"
              :key="marker.id"
              type="button"
              class="location-linked-item"
              :style="{
                '--map-item-color': marker.color || 'var(--color-primary)',
              }"
              @click="openMap(group.map.id)"
            >
              <i
                v-if="marker.icon"
                :class="['ra', markerIconClass(marker.icon)]"
                :style="{ color: marker.color }"
                aria-hidden="true"
              ></i>
              {{ marker.title }}
            </button>
            <div
              v-if="index < markerGroups.length - 1"
              class="location-linked-divider"
            ></div>
          </div>
        </div>

        <div v-show="sidePanelTab === 'areas'" class="location-linked-panel">
          <p v-if="areaGroups.length === 0" class="location-linked-empty">
            {{ t('maps.noAreas') }}
          </p>
          <div
            v-for="(group, index) in areaGroups"
            :key="group.map.id"
            class="location-linked-group"
          >
            <h5 class="location-linked-group-title">{{ group.map.title }}</h5>
            <button
              v-for="area in group.areas"
              :key="area.id"
              type="button"
              class="location-linked-item"
              :style="{
                '--map-item-color': area.color || 'var(--color-primary)',
              }"
              @click="openMap(group.map.id)"
            >
              {{ area.title || t('maps.untitledArea') }}
            </button>
            <div
              v-if="index < areaGroups.length - 1"
              class="location-linked-divider"
            ></div>
          </div>
        </div>
      </TabGroup>
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
.location-map-description {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.location-linked-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.location-linked-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.location-linked-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.location-linked-group-title {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.location-linked-item {
  position: relative;
  width: 100%;
  padding: 0.55rem 0.65rem 0.55rem 0.9rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.location-linked-item::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--map-item-color, transparent);
}

.location-linked-item:hover {
  background: var(--color-background-soft);
}

.location-linked-divider {
  height: 1px;
  margin: 0.25rem 0;
  background: var(--color-border);
}
</style>
