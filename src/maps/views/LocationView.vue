<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IconAffiliate,
  IconEye,
  IconMap,
  IconMapPinned,
} from '@tabler/icons-vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import { confirm } from '@/dialogs';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';
import LocationMapTab from '../components/LocationMapTab.vue';
import MapLocationEditor from '../components/MapLocationEditor.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { markerIconClass } from '../icons';
import type { MapEntityRef, MapLocation } from '../types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const locationStore = useMapLocationStore();

const location = computed(() =>
  locationStore.getById(String(route.params.id ?? '')),
);
const loading = computed(() => !locationStore.isLoaded);
const notFound = computed(() => locationStore.isLoaded && !location.value);

const tabs = computed(() => [
  { id: 'main', label: t('common.view'), icon: IconEye },
  ...(location.value?.map?.fileId
    ? [{ id: 'map', label: t('maps.mapTab'), icon: IconMap }]
    : []),
  { id: 'backlinks', label: t('maps.backlinks'), icon: IconMapPinned },
  { id: 'links', label: t('common.linkedEntities'), icon: IconAffiliate },
]);

const locationLinks = computed<MapEntityRef[]>(
  () => location.value?.entities ?? [],
);

const backlinkGroups = computed(() => {
  const locationId = location.value?.id;
  if (!locationId) return [];

  return locationStore.items
    .filter((entry) => entry.id !== locationId)
    .map((entry) => ({
      location: entry,
      markers: (entry.map?.markers ?? []).filter(
        (marker) => marker.locationId === locationId,
      ),
      areas: (entry.map?.areas ?? []).filter(
        (area) => area.locationId === locationId,
      ),
    }))
    .filter((group) => group.markers.length > 0 || group.areas.length > 0);
});

const showEditor = ref(false);
const activeTab = ref('main');

onMounted(async () => {
  await locationStore.load();
});

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
  await router.push('/maps');
  return true;
}

function handleSubmit(updated: MapLocation | null) {
  if (!updated) return;
  void locationStore.update(updated.id, {
    name: updated.name,
    description: updated.description,
    entities: updated.entities,
    map: updated.map,
  });
  showEditor.value = false;
}

function openLocation(locationId: string) {
  void router.push(`/locations/${locationId}`);
}
</script>

<template>
  <BaseEntityTabView
    :entity="location"
    entity-name="maps.location"
    list-route="/maps"
    :on-delete="handleDelete"
    :on-edit="() => (showEditor = true)"
    :title="location?.name"
    :not-found="notFound"
    :loading="loading"
    :tabs="tabs"
    v-model="activeTab"
    fill
  >
    <template #main>
      <div class="q-py-md">
        <p v-if="location?.description" class="text-body1">
          {{ location.description }}
        </p>
        <p v-else class="text-caption text-grey-7">
          {{ t('common.noDescription') }}
        </p>
      </div>
    </template>

    <template #map>
      <LocationMapTab v-if="location" :location="location" />
      <div v-else class="q-pa-md text-caption text-grey-7">
        {{ t('maps.noMapImage') }}
      </div>
    </template>

    <template #links>
      <EntityViewLinks :links="locationLinks" />
    </template>

    <template #backlinks>
      <div class="q-pa-md">
        <div
          v-if="backlinkGroups.length === 0"
          class="text-caption text-grey-7"
        >
          {{ t('maps.noBacklinks') }}
        </div>
        <div
          v-for="(group, index) in backlinkGroups"
          :key="group.location.id"
          class="q-mb-md"
        >
          <div
            class="text-caption text-uppercase text-weight-bold text-grey-7 q-mb-xs cursor-pointer"
            @click="openLocation(group.location.id)"
          >
            {{ group.location.name || t('maps.untitledLocation') }}
          </div>
          <QList>
            <QItem
              v-for="marker in group.markers"
              :key="marker.id"
              clickable
              class="q-mb-xs bg-white rounded-borders"
              :style="{
                borderLeft: `4px solid ${marker.color || 'var(--color-primary)'}`,
              }"
              @click="openLocation(group.location.id)"
            >
              <QItemSection>
                <div class="row items-center q-gutter-xs">
                  <i
                    v-if="marker.icon"
                    :class="['ra', markerIconClass(marker.icon)]"
                    :style="{ color: marker.color }"
                    aria-hidden="true"
                  ></i>
                  <span>{{ marker.title || t('maps.untitledMarker') }}</span>
                </div>
              </QItemSection>
            </QItem>
            <QItem
              v-for="area in group.areas"
              :key="area.id"
              clickable
              class="q-mb-xs bg-white rounded-borders"
              :style="{
                borderLeft: `4px solid ${area.color || 'var(--color-primary)'}`,
              }"
              @click="openLocation(group.location.id)"
            >
              <QItemSection>
                {{ area.title || t('maps.untitledArea') }}
              </QItemSection>
            </QItem>
          </QList>
          <QSeparator
            v-if="index < backlinkGroups.length - 1"
            class="q-my-sm"
          />
        </div>
      </div>
    </template>

    <template #sidepanel>
      <div
        v-show="activeTab === 'map' && !!location?.map?.fileId"
        id="location-map-sidebar"
        class="location-map-sidebar"
      ></div>
      <EntityScenesPanel
        v-if="activeTab !== 'map' && location"
        entity-type="location"
        :entity-id="location.id"
      />
    </template>

    <template #editor>
      <MapLocationEditor
        :location="location || null"
        :is-open="showEditor"
        @save="handleSubmit"
        @delete="handleDelete"
        @cancel="showEditor = false"
      />
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
.location-map-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
:deep(.q-tab-panels),
:deep(.q-tab-panel) {
  height: 100%;
}

:deep(.q-tab-panel) {
  padding: 0;
}
</style>
