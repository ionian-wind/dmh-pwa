<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { Item } from 'ol-contextmenu';
import 'ol-contextmenu/ol-contextmenu.css';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { confirm } from '@/dialogs';
import 'vue3-openlayers/vue3-openlayers.css';
import { getMapFile, useMapStore } from '../maps';
import type { MapEntity, MapEntityForm, MapMarker } from '../types';
import MapEditor from '../components/MapEditor.vue';
import MapMarkerEditor from '../components/MapMarkerEditor.vue';
import MapAreaEditor from '../components/MapAreaEditor.vue';
import MapMarkersPanel from '../components/MapMarkersPanel.vue';
import MapAreasPanel from '../components/MapAreasPanel.vue';
import EntityLinkList from '../components/EntityLinkList.vue';
import { useMapLocationStore } from '../locations';
import {
  MapActionsControl,
  type MapActionsControlLabels,
} from '../plugins/MapActionsControl';
import {
  dispatchMapAction,
  onMapAction,
  type MapActionEvent,
} from '../plugins/mapActionEvents';
import '../plugins/mapPlugins.css';
import { getMapFileBlob, revokeMapFileUrl } from '../utils/mapFileUtils';
import { normalizeMapEntity } from '../utils/normalize';
import {
  createMarkerDraft,
  removeMarker,
  upsertMarker,
} from '../utils/mapMarkers';
import {
  areaCenter,
  areaFillColor,
  areaTextColor,
  createAreaDraft,
  removeArea,
  upsertArea,
} from '../utils/mapAreas';
import {
  imageToMapPoint,
  imageToMapPoints,
  mapToImagePoint,
  mapToImagePoints,
} from '../utils/mapCoordinates';
import { markerIconClass } from '../icons';
import { createBox } from 'ol/interaction/Draw';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import type { MapArea, MapAreaShape, MapLocation } from '../types';

const route = useRoute();
const router = useRouter();
const mapStore = useMapStore();
const locationStore = useMapLocationStore();
const { t, locale } = useI18n();

const isLoaded = computed(() => mapStore.isLoaded);
const loading = computed(() => !isLoaded.value);
const map = ref<MapEntity | null>(null);
const notFound = computed(() => isLoaded.value && !map.value);
const mapReady = ref(false);
const isMapEditorOpen = ref(false);
const isMarkerEditorOpen = ref(false);
const editingMarker = ref<MapMarker | null>(null);
const isAddingMarker = ref(false);
const sidePanelTab = ref('markers');
const olMapRef = ref<any>(null);
const contextMenuRef = ref<any>(null);
const drawMode = ref<MapAreaShape | null>(null);
const hoveredAreaId = ref<string | null>(null);
const hoveredMarkerId = ref<string | null>(null);
const isAreaEditorOpen = ref(false);
const editingArea = ref<MapArea | null>(null);
type MapInfoSelection =
  | { kind: 'marker'; id: string }
  | { kind: 'area'; id: string }
  | null;
const infoSelection = ref<MapInfoSelection>(null);
const boxGeometry = createBox();
const drawShapes: MapAreaShape[] = ['polygon', 'circle', 'square', 'freehand'];

const mapLocations = computed(() =>
  (map.value?.locationIds ?? [])
    .map((id) => locationStore.getById(id))
    .filter((location): location is MapLocation => Boolean(location)),
);

let actionsControl: MapActionsControl | null = null;
let unbindMapActionListener: (() => void) | null = null;
let boundMap: any = null;

function actionsControlLabels(): MapActionsControlLabels {
  return {
    title: t('maps.mapActions'),
    addMarker: t('maps.addMarker'),
    drawArea: t('maps.drawArea'),
    shapes: {
      polygon: t('maps.shapes.polygon'),
      circle: t('maps.shapes.circle'),
      square: t('maps.shapes.square'),
      freehand: t('maps.shapes.freehand'),
    },
    cancelDrawing: t('maps.cancelDrawing'),
  };
}

const contextMenuItems = computed<Item[]>(() => [
  {
    text: t('maps.addMarkerHere'),
    callback: (object, map) => {
      dispatchMapAction(map, {
        action: 'add-marker',
        coordinate: [object.coordinate[0], object.coordinate[1]],
      });
    },
  },
  '-',
  {
    text: t('maps.drawArea'),
    items: drawShapes.map((shape) => ({
      text: t(`maps.shapes.${shape}`),
      callback: (_object, map) => {
        dispatchMapAction(map, { action: 'draw-area', shape });
      },
    })),
  },
]);

const sideTabs = computed(() => [
  { id: 'markers', label: 'maps.markers' },
  { id: 'areas', label: 'maps.areas' },
]);

const infoMarker = computed(() =>
  infoSelection.value?.kind === 'marker'
    ? map.value?.markers.find((marker) => marker.id === infoSelection.value!.id)
    : null,
);

const infoArea = computed(() =>
  infoSelection.value?.kind === 'area'
    ? map.value?.areas.find((area) => area.id === infoSelection.value!.id)
    : null,
);

const infoPosition = computed<[number, number] | undefined>(() => {
  if (infoMarker.value) return markerMapPosition(infoMarker.value);
  if (infoArea.value) return areaMapCenter(infoArea.value);
  return undefined;
});

const infoLocationName = computed(() => {
  if (!infoMarker.value?.locationId) return '';
  return locationStore.getById(infoMarker.value.locationId)?.name ?? '';
});

const drawType = computed(() =>
  drawMode.value === 'circle' || drawMode.value === 'square'
    ? 'Circle'
    : 'Polygon',
);
const drawFreehand = computed(() => drawMode.value === 'freehand');
const drawGeometryFunction = computed(() =>
  drawMode.value === 'square' ? boxGeometry : undefined,
);

function markerMapPosition(marker: MapMarker): [number, number] {
  return imageToMapPoint([marker.x, marker.y], size.value[1]);
}

function areaMapCenter(area: MapArea): [number, number] {
  return imageToMapPoint(areaCenter(area), size.value[1]);
}

function areaPolygonCoordinates(area: MapArea): Array<Array<[number, number]>> {
  return [imageToMapPoints(area.points, size.value[1])];
}

function areaCircleMapCenter(area: MapArea): [number, number] {
  return imageToMapPoint(area.center || [0, 0], size.value[1]);
}

function updateMapFromStore() {
  if (!mapStore.isLoaded) return;
  const found = mapStore.getById(route.params.id as string);
  map.value = found ? normalizeMapEntity(found) : null;
}

watch([() => mapStore.items, () => mapStore.isLoaded], updateMapFromStore, {
  immediate: true,
});

const imageUrl = ref<string | null>(null);
const size = ref<[number, number]>([0, 0]);
const center = ref<[number, number]>([0, 0]);
const extent = ref<[number, number, number, number]>([0, 0, 0, 0]);
const projection = computed(() => ({
  code: 'map-image',
  units: 'pixels',
  extent: extent.value,
}));

function releaseImageUrl() {
  if (imageUrl.value) {
    revokeMapFileUrl(imageUrl.value);
    imageUrl.value = null;
  }
}

async function loadMapImage() {
  mapReady.value = false;
  releaseImageUrl();
  if (!map.value?.fileId) return;

  const fileRecord = await getMapFile(map.value.fileId);
  if (!fileRecord) return;

  try {
    const blob = await getMapFileBlob(fileRecord);
    imageUrl.value = URL.createObjectURL(blob);
    const width = fileRecord.imageMetadata?.width || 1024;
    const height = fileRecord.imageMetadata?.height || 768;
    size.value = [width, height];
    center.value = [width / 2, height / 2];
    extent.value = [0, 0, width, height];
    await nextTick();
    mapReady.value = true;
  } catch {
    mapReady.value = false;
  }
}

watch(
  () => map.value?.fileId,
  () => {
    void loadMapImage();
  },
  { immediate: true },
);

onMounted(async () => {
  await Promise.all([mapStore.load(), locationStore.load()]);
  updateMapFromStore();
});

onBeforeUnmount(() => {
  unbindMapActions();
  releaseImageUrl();
});

const mapTitle = computed(() => map.value?.title || '');

const handleDelete = async () => {
  if (!map.value) return false;
  await mapStore.remove(map.value.id);
  await router.push('/maps');
  return true;
};

function startAddMarker() {
  isAddingMarker.value = true;
  drawMode.value = null;
}

function onMapClick(event: { coordinate?: number[]; pixel?: number[] }) {
  if (drawMode.value) return;
  closeMapInfo();

  const feature = event.pixel
    ? olMapRef.value?.forEachFeatureAtPixel?.(
        event.pixel,
        (candidate: any) => candidate,
      )
    : null;
  const areaId = feature?.get?.('areaId');
  if (areaId) {
    const area = map.value?.areas.find((entry) => entry.id === areaId);
    if (area) showAreaInfo(area);
    return;
  }

  if (!isAddingMarker.value || !event.coordinate) return;
  const [x, y] = mapToImagePoint(
    [event.coordinate[0], event.coordinate[1]],
    size.value[1],
  );
  editingMarker.value = createMarkerDraft(Math.round(x), Math.round(y));
  isMarkerEditorOpen.value = true;
  isAddingMarker.value = false;
}

function startDrawArea(shape: MapAreaShape) {
  drawMode.value = shape;
  isAddingMarker.value = false;
}

function createMarkerAtCoordinate(coordinate: [number, number]) {
  const [x, y] = mapToImagePoint(coordinate, size.value[1]);
  editingMarker.value = createMarkerDraft(Math.round(x), Math.round(y));
  isMarkerEditorOpen.value = true;
  isAddingMarker.value = false;
}

function closeContextMenu() {
  const exposed = contextMenuRef.value?.control;
  const control = exposed?.value ?? exposed;
  control?.closeMenu?.();
}

function onContextMenuOpen() {
  actionsControl?.closeMenu();
}

function handleMapAction(event: MapActionEvent) {
  if (event.action === 'add-marker') {
    if (event.coordinate) {
      createMarkerAtCoordinate(event.coordinate);
    } else {
      startAddMarker();
    }
  } else if (event.action === 'draw-area' && event.shape) {
    startDrawArea(event.shape);
  } else if (event.action === 'cancel-drawing') {
    cancelDrawing();
  }
  closeContextMenu();
}

function bindMapActions(mapInstance: any) {
  if (!mapInstance || boundMap === mapInstance) return;
  unbindMapActions();
  boundMap = mapInstance;
  actionsControl = new MapActionsControl(actionsControlLabels());
  actionsControl.setDrawingActive(Boolean(drawMode.value));
  mapInstance.addControl(actionsControl);
  unbindMapActionListener = onMapAction(mapInstance, handleMapAction);
}

function unbindMapActions() {
  unbindMapActionListener?.();
  unbindMapActionListener = null;
  if (boundMap && actionsControl) {
    boundMap.removeControl(actionsControl);
  }
  boundMap = null;
  actionsControl = null;
}

watch(
  () => olMapRef.value?.map,
  (mapInstance) => {
    if (mapInstance) {
      bindMapActions(mapInstance);
    } else {
      unbindMapActions();
    }
  },
  { immediate: true, flush: 'post' },
);

watch(locale, () => {
  actionsControl?.setLabels(actionsControlLabels());
});

watch(drawMode, (mode) => {
  actionsControl?.setDrawingActive(Boolean(mode));
});

function cancelDrawing() {
  drawMode.value = null;
}

function onAreaDrawn(event: any) {
  const shape = drawMode.value;
  if (!shape) return;
  const geometry = event.feature.getGeometry();
  let draft: MapArea;

  if (shape === 'circle') {
    draft = createAreaDraft(shape, {
      center: mapToImagePoint(geometry.getCenter(), size.value[1]),
      radius: geometry.getRadius(),
    });
  } else {
    const ring = geometry.getCoordinates()[0] as Array<[number, number]>;
    const points = [...ring];
    if (
      points.length > 1 &&
      points[0][0] === points[points.length - 1][0] &&
      points[0][1] === points[points.length - 1][1]
    ) {
      points.pop();
    }
    draft = createAreaDraft(shape, {
      points: mapToImagePoints(points, size.value[1]),
    });
  }

  editingArea.value = draft;
  isAreaEditorOpen.value = true;
  drawMode.value = null;
}

function editArea(area: MapArea) {
  editingArea.value = area;
  isAreaEditorOpen.value = true;
}

function closeAreaEditor() {
  isAreaEditorOpen.value = false;
  editingArea.value = null;
}

async function persistAreas(areas: MapArea[]) {
  if (!map.value) return;
  const updated = await mapStore.update(map.value.id, { areas });
  map.value = normalizeMapEntity(updated);
}

async function saveArea(area: MapArea) {
  if (!map.value) return;
  await persistAreas(upsertArea(map.value.areas, area));
  closeAreaEditor();
}

async function deleteArea(areaId: string) {
  if (!map.value) return;
  await persistAreas(removeArea(map.value.areas, areaId));
  closeAreaEditor();
}

function focusArea(areaId: string) {
  if (!map.value) return;
  const area = map.value.areas.find((entry) => entry.id === areaId);
  if (!area) return;
  center.value = areaMapCenter(area);
  hoveredAreaId.value = areaId;
}

async function deleteAreaFromList(areaId: string) {
  if (!map.value) return;
  const area = map.value.areas.find((entry) => entry.id === areaId);
  if (!area) return;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: area.title || t('maps.untitledArea'),
      }),
    ))
  ) {
    return;
  }
  await deleteArea(areaId);
}

function areaStyle(feature: any) {
  const areaId = feature?.get?.('areaId');
  const area = map.value?.areas.find((entry) => entry.id === areaId);
  if (!area) return undefined;
  const hovered = hoveredAreaId.value === area.id;
  if (hovered) {
    return [
      new Style({
        stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.95)', width: 7 }),
      }),
      new Style({
        fill: new Fill({ color: areaFillColor(area.color, 0.55) }),
        stroke: new Stroke({ color: area.color, width: 4 }),
      }),
    ];
  }
  return new Style({
    fill: new Fill({ color: areaFillColor(area.color, 0.22) }),
    stroke: new Stroke({ color: area.color, width: 2 }),
  });
}

function editMarker(marker: MapMarker) {
  editingMarker.value = marker;
  isMarkerEditorOpen.value = true;
}

function selectMarker(markerId: string) {
  if (!map.value) return;
  const marker = map.value.markers.find((entry) => entry.id === markerId);
  if (!marker) return;
  center.value = imageToMapPoint([marker.x, marker.y], size.value[1]);
  hoveredMarkerId.value = markerId;
}

async function deleteMarkerFromList(markerId: string) {
  if (!map.value) return;
  const marker = map.value.markers.find((entry) => entry.id === markerId);
  if (!marker) return;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: marker.title || t('maps.untitledMarker'),
      }),
    ))
  ) {
    return;
  }
  await deleteMarker(markerId);
}

function closeMarkerEditor() {
  isMarkerEditorOpen.value = false;
  editingMarker.value = null;
}

async function persistMarkers(markers: MapMarker[]) {
  if (!map.value) return;
  const updated = await mapStore.update(map.value.id, { markers });
  map.value = normalizeMapEntity(updated);
}

async function saveMarker(marker: MapMarker) {
  if (!map.value) return;
  await persistMarkers(upsertMarker(map.value.markers, marker));
  closeMarkerEditor();
}

async function deleteMarker(markerId: string) {
  if (!map.value) return;
  await persistMarkers(removeMarker(map.value.markers, markerId));
  closeMarkerEditor();
}

function openMapEditor() {
  isMapEditorOpen.value = true;
}

async function submitMapEditor(form: MapEntityForm) {
  if (!map.value) return;
  const updated = await mapStore.update(map.value.id, form);
  map.value = normalizeMapEntity(updated);
  isMapEditorOpen.value = false;
}

function showMarkerInfo(marker: MapMarker) {
  infoSelection.value = { kind: 'marker', id: marker.id };
}

function showAreaInfo(area: MapArea) {
  infoSelection.value = { kind: 'area', id: area.id };
}

function closeMapInfo() {
  infoSelection.value = null;
}

function editInfoItem() {
  if (infoMarker.value) {
    const marker = infoMarker.value;
    closeMapInfo();
    editMarker(marker);
  } else if (infoArea.value) {
    const area = infoArea.value;
    closeMapInfo();
    editArea(area);
  }
}

function hoverMarker(markerId: string | null) {
  hoveredMarkerId.value = markerId;
}

function hoverArea(areaId: string | null) {
  hoveredAreaId.value = areaId;
}

function refreshAreaHighlight() {
  void nextTick(() => {
    const mapInstance = olMapRef.value?.map;
    const layers = mapInstance?.getLayers?.();
    layers?.forEach?.((layer: any) => layer.changed?.());
    if (mapInstance?.renderSync) {
      mapInstance.renderSync();
    } else {
      mapInstance?.render?.();
    }
  });
}

watch(hoveredAreaId, refreshAreaHighlight);
</script>

<template>
  <BaseEntityView
    :entity="map"
    entity-name="maps.title"
    list-route="/maps"
    :on-delete="handleDelete"
    :on-edit="openMapEditor"
    :title="mapTitle"
    :not-found="notFound"
    :loading="loading"
    :unwrap-content="true"
    fill
  >
    <div v-if="mapReady" class="map-view-container">
      <div v-if="isAddingMarker || drawMode" class="map-hint">
        {{ isAddingMarker ? t('maps.clickToPlaceMarker') : t('maps.drawHint') }}
      </div>

      <ol-map
        ref="olMapRef"
        :loadTilesWhileAnimating="true"
        :loadTilesWhileInteracting="true"
        style="height: 100%"
        @click="onMapClick"
      >
        <ol-view
          :center="center"
          :zoom="2"
          :min-zoom="1"
          :max-zoom="6"
          :projection="projection"
          :extent="extent"
        />
        <ol-zoom-control />
        <ol-context-menu-control
          ref="contextMenuRef"
          :items="contextMenuItems"
          :default-items="false"
          :width="200"
          @open="onContextMenuOpen"
        />

        <ol-image-layer id="map-view">
          <ol-source-image-static
            :url="imageUrl"
            :imageSize="size"
            :imageExtent="extent"
            :projection="projection"
            :wrapX="false"
            :wrapY="false"
          />
        </ol-image-layer>

        <ol-vector-layer :style="areaStyle">
          <ol-source-vector>
            <ol-feature
              v-for="area in map?.areas || []"
              :key="area.id"
              :properties="{ areaId: area.id }"
            >
              <ol-geom-polygon
                v-if="area.shape !== 'circle'"
                :coordinates="areaPolygonCoordinates(area)"
              />
              <ol-geom-circle
                v-else
                :center="areaCircleMapCenter(area)"
                :radius="area.radius"
              />
            </ol-feature>
          </ol-source-vector>
        </ol-vector-layer>

        <ol-interaction-draw
          v-if="drawMode"
          :type="drawType"
          :freehand="drawFreehand"
          :geometry-function="drawGeometryFunction"
          @drawend="onAreaDrawn"
        />

        <ol-overlay
          v-for="marker in map?.markers || []"
          :key="marker.id"
          :position="markerMapPosition(marker)"
          positioning="center-center"
          :stop-event="true"
        >
          <button
            type="button"
            class="map-marker-button"
            :class="{ 'is-hovered': hoveredMarkerId === marker.id }"
            :style="{ color: marker.color }"
            :title="marker.title"
            @click.stop="showMarkerInfo(marker)"
          >
            <i
              v-if="marker.icon"
              :class="['ra', markerIconClass(marker.icon)]"
              aria-hidden="true"
            ></i>
            <span class="map-marker-label">{{ marker.title }}</span>
          </button>
        </ol-overlay>

        <ol-overlay
          v-for="area in map?.areas || []"
          :key="`area-label-${area.id}`"
          :position="areaMapCenter(area)"
          positioning="center-center"
          :stop-event="true"
        >
          <button
            type="button"
            class="map-area-label"
            :style="{
              backgroundColor: areaFillColor(area.color, 0.82),
              color: areaTextColor(area.color),
            }"
            :title="area.title"
            @click.stop="showAreaInfo(area)"
          >
            <i
              v-if="area.icon"
              :class="['ra', markerIconClass(area.icon)]"
              :style="{ color: area.color }"
              aria-hidden="true"
            ></i>
            {{ area.title }}
          </button>
        </ol-overlay>

        <ol-overlay
          v-if="infoSelection && infoPosition"
          :position="infoPosition"
          positioning="bottom-center"
          :stop-event="true"
        >
          <div class="map-info-popup">
            <button
              type="button"
              class="map-info-close"
              :title="t('common.close')"
              :aria-label="t('common.close')"
              @click.stop="closeMapInfo"
            >
              ×
            </button>
            <h4 class="map-info-title">
              {{
                infoMarker?.title || infoArea?.title || t('maps.untitledArea')
              }}
            </h4>
            <p v-if="infoLocationName" class="map-info-location">
              {{ infoLocationName }}
            </p>
            <p
              v-if="infoMarker?.description || infoArea?.description"
              class="map-info-description"
            >
              {{ infoMarker?.description || infoArea?.description }}
            </p>
            <EntityLinkList
              v-if="
                (infoMarker?.entities.length ?? 0) > 0 ||
                (infoArea?.entities.length ?? 0) > 0
              "
              :links="infoMarker?.entities || infoArea?.entities || []"
            />
            <div class="map-info-actions">
              <button
                type="button"
                class="map-info-edit"
                @click.stop="editInfoItem"
              >
                {{ t('common.edit') }}
              </button>
            </div>
          </div>
        </ol-overlay>
      </ol-map>
    </div>

    <template #sidepanel>
      <TabGroup
        v-model="sidePanelTab"
        :tabs="sideTabs"
        size="sm"
        align="justify"
      >
        <div v-show="sidePanelTab === 'markers'">
          <MapMarkersPanel
            :markers="map?.markers || []"
            @select-marker="selectMarker"
            @edit="editMarker"
            @delete="deleteMarkerFromList"
            @hover="hoverMarker"
          />
        </div>
        <div v-show="sidePanelTab === 'areas'">
          <MapAreasPanel
            :areas="map?.areas || []"
            :show-title="false"
            @select-area="focusArea"
            @edit="editArea"
            @delete="deleteAreaFromList"
            @hover="hoverArea"
          />
        </div>
      </TabGroup>
    </template>

    <template #editor>
      <MapEditor
        :map="map"
        :is-open="isMapEditorOpen"
        @submit="submitMapEditor"
        @cancel="isMapEditorOpen = false"
      />
      <MapMarkerEditor
        :marker="editingMarker"
        :locations="mapLocations"
        :is-open="isMarkerEditorOpen"
        @save="saveMarker"
        @delete="deleteMarker"
        @cancel="closeMarkerEditor"
      />
      <MapAreaEditor
        :area="editingArea"
        :areas="map?.areas || []"
        :is-open="isAreaEditorOpen"
        @save="saveArea"
        @delete="deleteArea"
        @cancel="closeAreaEditor"
      />
    </template>
  </BaseEntityView>
</template>

<style scoped>
.map-view-container {
  position: relative;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  border-radius: var(--border-radius);
}

.map-hint {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 25;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 0.8rem;
  pointer-events: none;
  transform: translateX(-50%);
  white-space: nowrap;
}

.map-marker-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.4rem;
  border: none;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  font-size: 1.25rem;
  transform: translateY(-50%);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.map-marker-button.is-hovered {
  box-shadow:
    0 0 0 3px var(--color-primary),
    0 2px 8px rgba(0, 0, 0, 0.4);
  transform: translateY(-50%) scale(1.12);
}

.map-marker-label {
  max-width: 140px;
  overflow: hidden;
  color: var(--color-text);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-area-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  border: none;
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
  pointer-events: auto;
}

.is-active {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.map-info-popup {
  position: relative;
  min-width: 220px;
  max-width: 320px;
  padding: 0.75rem 2rem 0.75rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  box-shadow: var(--shadow-lg);
}

.map-info-close {
  position: absolute;
  top: 0.25rem;
  right: 0.35rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.map-info-title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.map-info-location {
  margin: 0 0 0.35rem;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.map-info-description {
  margin: 0 0 0.5rem;
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.map-info-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.map-info-edit {
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
}
</style>
