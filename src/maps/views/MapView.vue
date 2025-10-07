<script setup lang="ts">
import {ref, computed, onMounted, watch, onBeforeUnmount, nextTick, reactive} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import { useMapStore, getMapFile } from '../maps';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import 'vue3-openlayers/vue3-openlayers.css';
import { usePictureUrlCacheStore } from '@/jukebox/stores';
import {MapEntity} from "@/maps/types";

const route = useRoute();
const router = useRouter();
const mapStore = useMapStore();

const pictureUrlCacheStore = usePictureUrlCacheStore();

const isLoaded = computed(() => mapStore.isLoaded);
const loading = computed(() => !isLoaded.value);
const map = ref<MapEntity | null>(null);
const notFound = computed(() => isLoaded.value && !map.value);
const mapReady = ref(false);

function updateMapFromStore() {
  console.log('updateMapFromStore called');
  console.log('mapStore.isLoaded:', mapStore.isLoaded);
  console.log('route.params.id:', route.params.id);
  if (!mapStore.isLoaded) {
    console.log('Store not loaded, returning');
    return;
  }
  const found = mapStore.getById(route.params.id as string);
  console.log('Result of getById:', found);
  if (found) {
    map.value = found;
  } else {
    console.log('Map not found, would redirect to /maps');
    // router.push('/maps');
  }
}

watch([
  () => mapStore.items,
  () => mapStore.isLoaded
], (...args) => {
  console.log('Watcher on mapStore.items/isLoaded fired', args);
  updateMapFromStore();
}, { immediate: true });

// Watch map.value and load image when it changes
watch(map, async (newMap, oldMap) => {
  console.log('Watcher on map fired', { newMap, oldMap });
  if (newMap && newMap !== oldMap) {
    await loadMapImage();
  }
}, { immediate: true });

const handleDelete = async () => {
  if (!map.value) return;
  await mapStore.remove(map.value.id);
  await router.push('/maps');
};

const mapTitle = computed(() => map.value?.title || '');

onMounted(async () => {
  console.log('MapView: Component mounted');
  console.log('MapView: Loading map store...');
  await mapStore.load();
  console.log('MapView: Map store loaded, isLoaded:', mapStore.isLoaded);
  console.log('MapView: Current map:', map.value);
  await loadMapImage();
});
onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});

const imageUrl = ref<string | null>(null);
const mapFile = ref<any>(null);
const size = ref([0, 0]);
const center = ref([0, 0]);
const extent = ref([0, 0, 0, 0]);
const projection = reactive({
  code: "map-image",
  units: "pixels",
  extent: extent,
});

async function loadMapImage() {
  console.log('MapView: loadMapImage called');
  mapReady.value = false;
  imageUrl.value = null;
  mapFile.value = null;
  
  if (!map.value) {
    console.log('MapView: No map found');
    return;
  }
  
  if (!map.value.fileId) {
    console.log('MapView: No fileId in map');
    return;
  }
  
  console.log('MapView: Loading file with ID:', map.value.fileId);
  const fileRecord = await getMapFile(map.value.fileId);
  console.log('MapView: File record:', fileRecord);
  
  if (fileRecord && fileRecord.handle) {
    mapFile.value = fileRecord;
    console.log('MapView: Map file set:', mapFile.value);
    
    try {
      // @ts-ignore
      const file = await fileRecord.handle.getFile();
      imageUrl.value = pictureUrlCacheStore.getPictureUrl(file);
      console.log('MapView: imageUrl set to', imageUrl.value);
      console.log('MapView: imageMetadata', fileRecord.imageMetadata);

      const width = mapFile.value?.imageMetadata?.width ?? 0;
      const height = mapFile.value?.imageMetadata?.height ?? 0;
      
      size.value = [width, height];
      center.value = [width / 2, height / 2];
      extent.value = [0, 0, ...size.value];
      
      // Wait for Vue to update reactivity, then validate and set mapReady
      await nextTick();

      mapReady.value = true;
      console.log('MapView: mapReady set to:', true);
    } catch (error) {
      console.error('MapView: Error getting file from handle:', error);
    }
  } else {
    console.log('MapView: No file record or handle found');
  }
}
</script>

<template>
  <BaseEntityView
    :entity="map"
    entity-name="maps.title"
    list-route="/maps"
    :on-delete="handleDelete"
    :title="mapTitle"
    :not-found="notFound"
    :loading="loading"
    :unwrap-content="true"
  >
    <div v-if="mapReady" class="map-view-container">
      <ol-map
        :loadTilesWhileAnimating="true"
        :loadTilesWhileInteracting="true"
        style="height: 100vh"
      >
        <ol-view
          ref="view"
          :center="center"
          :zoom="3"
          :min-zoom="2"
          :max-zoom="5"
          :projection="projection"
          :extent="extent"
        />
        <ol-zoom-control />
        
        <ol-zoomslider-control />

        <ol-image-layer id="map-view">
          <ol-source-image-static
            :url="imageUrl"
            :imageSize="size"
            :imageExtent="extent"
            :projection="projection"
            :wrapX="false"
            :wrapY="false"
          ></ol-source-image-static>
        </ol-image-layer>
      </ol-map>
    </div>
  </BaseEntityView>
</template>

