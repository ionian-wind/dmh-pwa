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
import {
  IconEdit,
  IconEye,
  IconEyeOff,
  IconLiveView,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-vue';
import type { Item } from 'ol-contextmenu';
import 'ol-contextmenu/ol-contextmenu.css';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { confirm, prompt } from '@/dialogs';
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
import { enableFrequentHitDetectionReads } from '../utils/canvasReadback';
import { contrastTextColor } from '../utils/colors';
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
import { MAP_BASE_LAYER_ID, createLayer } from '../utils/mapLayers';
import {
  imageToMapPoint,
  imageToMapPoints,
  mapToImagePoint,
  mapToImagePoints,
} from '../utils/mapCoordinates';
import { markerIconClass, markerIconGlyph } from '../icons';
import { createBox } from 'ol/interaction/Draw';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Circle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import type { MapArea, MapAreaShape, MapLayer } from '../types';

const route = useRoute();
const router = useRouter();
const mapStore = useMapStore();
const locationStore = useMapLocationStore();
const { t, locale } = useI18n();

enableFrequentHitDetectionReads();

const isLoaded = computed(() => mapStore.isLoaded);
const loading = computed(() => !isLoaded.value);
const map = ref<MapEntity | null>(null);
const notFound = computed(() => isLoaded.value && !map.value);
const mapReady = ref(false);
const imageLoaded = ref(false);
const imageLoadFailed = ref(false);
const isMapEditorOpen = ref(false);
const isMarkerEditorOpen = ref(false);
const editingMarker = ref<MapMarker | null>(null);
const isAddingMarker = ref(false);
const isEditMode = ref(false);
const showLabels = ref(true);
const sidePanelTab = ref('markers');
const hiddenLayerIds = ref<Set<string>>(new Set());
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

const allLocations = computed(() => locationStore.items);

function isLayerHidden(layerId: string) {
  return !isEditMode.value && hiddenLayerIds.value.has(layerId);
}

const layers = computed(() => map.value?.layers ?? []);

const visibleMarkers = computed(() =>
  (map.value?.markers ?? []).filter((marker) => !isLayerHidden(marker.layerId)),
);

const visibleAreas = computed(() =>
  (map.value?.areas ?? []).filter((area) => !isLayerHidden(area.layerId)),
);

function markersForLayer(layerId: string) {
  return (map.value?.markers ?? []).filter(
    (marker) => marker.layerId === layerId,
  );
}

function areasForLayer(layerId: string) {
  return (map.value?.areas ?? []).filter((area) => area.layerId === layerId);
}

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

const infoLocation = computed(() => {
  const locationId =
    infoMarker.value?.locationId || infoArea.value?.locationId || null;
  return locationId ? locationStore.getById(locationId) : null;
});

const infoLocationName = computed(() => infoLocation.value?.name ?? '');

function goToInfoLocation() {
  if (!infoLocation.value) return;
  const linkedMap = mapStore.items.find(
    (entry) => entry.locationId === infoLocation.value?.id,
  );
  void router.push(
    linkedMap ? `/maps/${linkedMap.id}` : `/locations/${infoLocation.value.id}`,
  );
}

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
  imageLoaded.value = false;
  imageLoadFailed.value = false;
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
    imageLoadFailed.value = true;
  }
}

function onImageLoadStart() {
  imageLoaded.value = false;
  imageLoadFailed.value = false;
}

function onImageLoadEnd() {
  imageLoaded.value = true;
}

function onImageLoadError() {
  imageLoaded.value = false;
  imageLoadFailed.value = true;
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
  void document.fonts
    ?.load('20px RPGAwesome')
    .then(() => olMapRef.value?.map?.render?.())
    .catch(() => undefined);
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
    ? olMapRef.value?.map?.forEachFeatureAtPixel?.(
        event.pixel,
        (candidate: any) => candidate,
      )
    : null;
  const markerId = feature?.get?.('markerId');
  if (markerId) {
    const marker = map.value?.markers.find((entry) => entry.id === markerId);
    if (marker) showMarkerInfo(marker);
    return;
  }

  const areaId = feature?.get?.('areaId');
  if (areaId) {
    const area = map.value?.areas.find((entry) => entry.id === areaId);
    if (area) showAreaInfo(area);
    return;
  }

  if (!isEditMode.value) return;
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
  actionsControl.setVisible(isEditMode.value);
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

function markerStyle(feature: any) {
  const markerId = feature?.get?.('markerId');
  const marker = map.value?.markers.find((entry) => entry.id === markerId);
  if (!marker) return undefined;

  const hovered = hoveredMarkerId.value === marker.id;
  const glyph = markerIconGlyph(marker.icon);
  const styles: Style[] = [];

  const background = marker.backgroundColor?.trim();
  if (background && background !== 'transparent') {
    styles.push(
      new Style({
        image: new Circle({
          radius: glyph ? (hovered ? 17 : 15) : hovered ? 12 : 10,
          fill: new Fill({ color: background }),
        }),
      }),
    );
  }

  if (glyph) {
    styles.push(
      new Style({
        text: new Text({
          text: glyph,
          font: `${hovered ? 24 : 20}px RPGAwesome`,
          fill: new Fill({ color: marker.color }),
          stroke: hovered
            ? new Stroke({ color: contrastTextColor(marker.color), width: 3 })
            : undefined,
          textAlign: 'center',
          textBaseline: 'middle',
        }),
      }),
    );
  } else {
    styles.push(
      new Style({
        image: new Circle({
          radius: hovered ? 8 : 6,
          fill: new Fill({ color: marker.color }),
          stroke: new Stroke({
            color: hovered ? contrastTextColor(marker.color) : '#fff',
            width: hovered ? 3 : 2,
          }),
        }),
      }),
    );
  }

  if (showLabels.value) {
    styles.push(
      new Style({
        text: new Text({
          text: marker.title || t('maps.untitledMarker'),
          font: `${hovered ? 700 : 600} 12px sans-serif`,
          fill: new Fill({ color: '#333' }),
          backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
          padding: [2, 6, 2, 6],
          textAlign: 'center',
          textBaseline: 'middle',
          offsetY: glyph ? 20 : 14,
        }),
      }),
    );
  }

  return styles;
}

function mapFeatureStyle(feature: any) {
  return feature?.get?.('markerId') ? markerStyle(feature) : areaStyle(feature);
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

async function deleteMapFromEditor() {
  isMapEditorOpen.value = false;
  await handleDelete();
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

watch([hoveredAreaId, hoveredMarkerId, showLabels], refreshAreaHighlight);

function toggleLayerVisibility(layerId: string) {
  const next = new Set(hiddenLayerIds.value);
  if (next.has(layerId)) {
    next.delete(layerId);
  } else {
    next.add(layerId);
  }
  hiddenLayerIds.value = next;
  if (isLayerHidden(layerId)) {
    const selected = infoMarker.value || infoArea.value;
    if (selected?.layerId === layerId) closeMapInfo();
  }
}

async function persistLayers(updatedLayers: MapLayer[]) {
  if (!map.value) return;
  const updated = await mapStore.update(map.value.id, {
    layers: updatedLayers,
  });
  map.value = normalizeMapEntity(updated);
}

async function addLayer() {
  const title = await prompt(t('maps.layerName'), {
    title: t('maps.addLayer'),
  });
  if (!title?.trim()) return;
  await persistLayers([...layers.value, createLayer(title)]);
}

async function editLayer(layer: MapLayer) {
  const title = await prompt(t('maps.layerName'), {
    title: t('maps.editLayer'),
    modelValue: layer.title,
  });
  if (!title?.trim()) return;
  await persistLayers(
    layers.value.map((entry) =>
      entry.id === layer.id ? { ...entry, title: title.trim() } : entry,
    ),
  );
}

async function deleteLayer(layer: MapLayer) {
  if (!map.value || layer.id === MAP_BASE_LAYER_ID) return;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: layer.title,
      }),
    ))
  ) {
    return;
  }

  const updated = await mapStore.update(map.value.id, {
    layers: layers.value.filter((entry) => entry.id !== layer.id),
    markers: map.value.markers.map((marker) =>
      marker.layerId === layer.id
        ? { ...marker, layerId: MAP_BASE_LAYER_ID }
        : marker,
    ),
    areas: map.value.areas.map((area) =>
      area.layerId === layer.id
        ? { ...area, layerId: MAP_BASE_LAYER_ID }
        : area,
    ),
  });
  map.value = normalizeMapEntity(updated);
}

watch(isEditMode, (editing) => {
  actionsControl?.setVisible(editing);
  if (!editing) {
    drawMode.value = null;
    isAddingMarker.value = false;
    closeMarkerEditor();
    closeAreaEditor();
    closeMapInfo();
  }
});
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
    :header-show-edit="isEditMode"
    :header-show-delete="isEditMode"
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
          v-if="isEditMode"
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
            @imageloadstart="onImageLoadStart"
            @imageloadend="onImageLoadEnd"
            @imageloaderror="onImageLoadError"
          />
        </ol-image-layer>

        <template v-if="imageLoaded">
          <ol-vector-layer
            v-for="(layer, layerIndex) in layers"
            :key="layer.id"
            :z-index="layerIndex"
            :visible="!isLayerHidden(layer.id)"
            :style="mapFeatureStyle"
          >
            <ol-source-vector>
              <ol-feature
                v-for="marker in markersForLayer(layer.id)"
                :key="`marker-${marker.id}`"
                :properties="{ kind: 'marker', markerId: marker.id }"
              >
                <ol-geom-point :coordinates="markerMapPosition(marker)" />
              </ol-feature>
              <ol-feature
                v-for="area in areasForLayer(layer.id)"
                :key="area.id"
                :properties="{ kind: 'area', areaId: area.id }"
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
        </template>

        <ol-interaction-draw
          v-if="drawMode"
          :type="drawType"
          :freehand="drawFreehand"
          :geometry-function="drawGeometryFunction"
          @drawend="onAreaDrawn"
        />

        <ol-overlay
          v-if="imageLoaded && showLabels"
          v-for="area in visibleAreas"
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
          :offset="[0, -18]"
          class-name="map-info-overlay"
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
                v-if="infoLocation"
                type="button"
                class="map-info-edit"
                @click.stop="goToInfoLocation"
              >
                {{ t('maps.goToLocation') }}
              </button>
              <button
                v-if="isEditMode"
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

      <div
        v-if="!imageLoaded && !imageLoadFailed"
        class="absolute-full flex flex-center bg-white z-top"
      >
        <QSpinner
          color="primary"
          size="3em"
          :aria-label="t('common.loading')"
        />
      </div>

      <div v-if="imageLoaded" class="map-accessible-markers">
        <button
          v-for="marker in visibleMarkers"
          :key="`accessible-${marker.id}`"
          type="button"
          class="map-marker-accessible"
          :class="{ 'is-hovered': hoveredMarkerId === marker.id }"
          @click.stop="showMarkerInfo(marker)"
        >
          {{ marker.title || t('maps.untitledMarker') }}
        </button>
      </div>
    </div>

    <template #sidepanel>
      <div class="map-sidepanel">
        <div class="map-sidepanel-content">
          <TabGroup
            v-model="sidePanelTab"
            :tabs="sideTabs"
            size="sm"
            align="justify"
          >
            <div v-show="sidePanelTab === 'markers'">
              <div
                v-for="(layer, layerIndex) in layers"
                :key="`marker-layer-${layer.id}`"
                class="q-mb-sm"
              >
                <div class="row items-center justify-between q-px-sm q-pt-sm">
                  <span
                    class="text-caption text-uppercase text-weight-bold text-grey-7"
                    >{{ layer.title }}</span
                  >
                  <span class="row items-center">
                    <template v-if="!isEditMode">
                      <QBtn
                        flat
                        size="sm"
                        :title="
                          isLayerHidden(layer.id)
                            ? t('maps.showLayer')
                            : t('maps.hideLayer')
                        "
                        @click="toggleLayerVisibility(layer.id)"
                      >
                        <IconEyeOff v-if="isLayerHidden(layer.id)" />
                        <IconEye v-else />
                      </QBtn>
                    </template>
                    <template v-else>
                      <QBtn
                        flat
                        size="sm"
                        :title="t('maps.editLayer')"
                        @click="editLayer(layer)"
                      >
                        <IconPencil :size="16" />
                      </QBtn>
                      <QBtn
                        v-if="layer.id !== MAP_BASE_LAYER_ID"
                        flat
                        size="sm"
                        color="negative"
                        :title="t('maps.deleteLayer')"
                        @click="deleteLayer(layer)"
                      >
                        <IconTrash :size="16" />
                      </QBtn>
                    </template>
                  </span>
                </div>
                <MapMarkersPanel
                  :markers="markersForLayer(layer.id)"
                  :editable="isEditMode"
                  hide-empty
                  @select-marker="selectMarker"
                  @edit="editMarker"
                  @delete="deleteMarkerFromList"
                  @hover="hoverMarker"
                />
                <QSeparator v-if="layerIndex < layers.length - 1" />
              </div>
            </div>
            <div v-show="sidePanelTab === 'areas'">
              <div
                v-for="(layer, layerIndex) in layers"
                :key="`area-layer-${layer.id}`"
                class="q-mb-sm"
              >
                <div class="row items-center justify-between q-px-sm q-pt-sm">
                  <span
                    class="text-caption text-uppercase text-weight-bold text-grey-7"
                    >{{ layer.title }}</span
                  >
                  <span class="row items-center">
                    <template v-if="!isEditMode">
                      <QBtn
                        flat
                        size="sm"
                        :title="
                          isLayerHidden(layer.id)
                            ? t('maps.showLayer')
                            : t('maps.hideLayer')
                        "
                        @click="toggleLayerVisibility(layer.id)"
                      >
                        <IconEyeOff v-if="isLayerHidden(layer.id)" />
                        <IconEye v-else />
                      </QBtn>
                    </template>
                    <template v-else>
                      <QBtn
                        flat
                        size="sm"
                        :title="t('maps.editLayer')"
                        @click="editLayer(layer)"
                      >
                        <IconPencil :size="16" />
                      </QBtn>
                      <QBtn
                        v-if="layer.id !== MAP_BASE_LAYER_ID"
                        flat
                        size="sm"
                        color="negative"
                        :title="t('maps.deleteLayer')"
                        @click="deleteLayer(layer)"
                      >
                        <IconTrash :size="16" />
                      </QBtn>
                    </template>
                  </span>
                </div>
                <MapAreasPanel
                  :areas="areasForLayer(layer.id)"
                  :show-title="false"
                  :editable="isEditMode"
                  hide-empty
                  @select-area="focusArea"
                  @edit="editArea"
                  @delete="deleteAreaFromList"
                  @hover="hoverArea"
                />
                <QSeparator v-if="layerIndex < layers.length - 1" />
              </div>
            </div>
          </TabGroup>
        </div>

        <QSeparator />
        <div class="map-sidepanel-controls bg-white">
          <QList>
            <QItem
              v-if="isEditMode"
              class="map-layer-add"
              clickable
              v-ripple
              @click="addLayer"
            >
              <QItemSection>
                {{ t('maps.addLayer') }}
              </QItemSection>
              <QItemSection side>
                <IconPlus :size="18" />
              </QItemSection>
            </QItem>

            <QItem class="map-label-toggle">
              <QItemSection>
                {{ t('maps.showLabels') }}
              </QItemSection>
              <QItemSection side>
                <QToggle
                  :model-value="showLabels"
                  @update:model-value="showLabels = $event"
                />
              </QItemSection>
            </QItem>

            <QItem class="map-mode-toggle">
              <QItemSection>
                <QBtnGroup spread class="full-width">
                  <QBtn
                    class="map-mode-view"
                    color="primary"
                    :outline="isEditMode"
                    :title="t('maps.viewMode')"
                    :aria-label="t('maps.viewMode')"
                    :aria-pressed="!isEditMode"
                    @click="isEditMode = false"
                  >
                    <IconLiveView :size="18" />
                  </QBtn>
                  <QBtn
                    class="map-mode-edit"
                    color="primary"
                    :outline="!isEditMode"
                    :title="t('maps.editMode')"
                    :aria-label="t('maps.editMode')"
                    :aria-pressed="isEditMode"
                    @click="isEditMode = true"
                  >
                    <IconEdit :size="18" />
                  </QBtn>
                </QBtnGroup>
              </QItemSection>
            </QItem>
          </QList>
        </div>
      </div>
    </template>

    <template #editor>
      <MapEditor
        :map="map"
        :is-open="isMapEditorOpen"
        @submit="submitMapEditor"
        @delete="deleteMapFromEditor"
        @cancel="isMapEditorOpen = false"
      />
      <MapMarkerEditor
        :marker="editingMarker"
        :locations="allLocations"
        :layers="map?.layers || []"
        :is-open="isMarkerEditorOpen"
        @save="saveMarker"
        @delete="deleteMarker"
        @cancel="closeMarkerEditor"
      />
      <MapAreaEditor
        :area="editingArea"
        :locations="allLocations"
        :layers="map?.layers || []"
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

.map-sidepanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.map-sidepanel-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.map-sidepanel-controls {
  flex: 0 0 auto;
  margin-top: auto;
  background: var(--color-background);
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

.map-accessible-markers {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
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
  z-index: 1000;
  min-width: 220px;
  max-width: 320px;
  padding: 0.75rem 2rem 0.75rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  box-shadow: var(--shadow-lg);
}

:global(.map-info-overlay) {
  z-index: 1000;
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
  gap: 0.4rem;
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
