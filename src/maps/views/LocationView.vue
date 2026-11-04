<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { IconMapPin2 } from '@tabler/icons-vue';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import TabGroup from '@/components/common/TabGroup.vue';
import { confirm } from '@/dialogs';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';
import MapLocationEditor from '../components/MapLocationEditor.vue';
import { deleteMapLocation, useMapLocationStore } from '../locations';
import { useMapStore } from '../maps';
import { markerIconClass } from '../icons';
import type { MapEntityRef } from '../types';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const locationStore = useMapLocationStore();
const mapStore = useMapStore();

const location = computed(() =>
  locationStore.getById(String(route.params.id ?? '')),
);
const loading = computed(() => !locationStore.isLoaded);
const notFound = computed(() => locationStore.isLoaded && !location.value);

const tabs = useEntityViewTabs();
const locationLinks = computed<MapEntityRef[]>(
  () => location.value?.entities ?? [],
);

const linkedMap = computed(
  () =>
    mapStore.items.find((map) => map.locationId === location.value?.id) ?? null,
);

const headerButtons = computed(() =>
  linkedMap.value
    ? [
        {
          color: 'warning',
          title: 'maps.openLinkedMap',
          icon: IconMapPin2,
          event: () => openMap(linkedMap.value!.id),
        },
      ]
    : [],
);

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
const activeTab = ref('main');
const sidePanelTab = ref('markers');

onMounted(async () => {
  await Promise.all([locationStore.load(), mapStore.load()]);
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
  await router.push('/maps?tab=locations');
  return true;
}

function handleSubmit(updated: typeof location.value) {
  if (!updated) return;
  void locationStore.update(updated.id, {
    name: updated.name,
    description: updated.description,
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
    :tabs="tabs"
    :header-buttons="headerButtons"
    v-model="activeTab"
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

    <template #links>
      <EntityViewLinks :links="locationLinks" />
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
        <div v-show="sidePanelTab === 'markers'" class="q-pa-sm">
          <div
            v-if="markerGroups.length === 0"
            class="text-caption text-grey-7"
          >
            {{ t('maps.noMarkers') }}
          </div>
          <div
            v-for="(group, index) in markerGroups"
            :key="group.map.id"
            class="q-mb-sm"
          >
            <div
              class="location-linked-group-title text-caption text-uppercase text-grey-7 q-mb-xs"
            >
              {{ group.map.title }}
            </div>
            <QList>
              <QItem
                v-for="marker in group.markers"
                :key="marker.id"
                clickable
                class="location-linked-item q-mb-xs bg-white rounded-borders"
                :style="{
                  borderLeft: `4px solid ${marker.color || 'var(--color-primary)'}`,
                }"
                @click="openMap(group.map.id)"
              >
                <QItemSection>
                  <div class="row items-center q-gutter-xs">
                    <i
                      v-if="marker.icon"
                      :class="['ra', markerIconClass(marker.icon)]"
                      :style="{ color: marker.color }"
                      aria-hidden="true"
                    ></i>
                    <span>{{ marker.title }}</span>
                  </div>
                </QItemSection>
              </QItem>
            </QList>
            <QSeparator
              v-if="index < markerGroups.length - 1"
              class="q-my-sm"
            />
          </div>
        </div>

        <div v-show="sidePanelTab === 'areas'" class="q-pa-sm">
          <div v-if="areaGroups.length === 0" class="text-caption text-grey-7">
            {{ t('maps.noAreas') }}
          </div>
          <div
            v-for="(group, index) in areaGroups"
            :key="group.map.id"
            class="q-mb-sm"
          >
            <div
              class="location-linked-group-title text-caption text-uppercase text-grey-7 q-mb-xs"
            >
              {{ group.map.title }}
            </div>
            <QList>
              <QItem
                v-for="area in group.areas"
                :key="area.id"
                clickable
                class="location-linked-item q-mb-xs bg-white rounded-borders"
                :style="{
                  borderLeft: `4px solid ${area.color || 'var(--color-primary)'}`,
                }"
                @click="openMap(group.map.id)"
              >
                <QItemSection>
                  {{ area.title || t('maps.untitledArea') }}
                </QItemSection>
              </QItem>
            </QList>
            <QSeparator v-if="index < areaGroups.length - 1" class="q-my-sm" />
          </div>
        </div>
      </TabGroup>
      <QSeparator class="q-my-sm" />
      <EntityScenesPanel
        v-if="location"
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
