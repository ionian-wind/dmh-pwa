<template>
  <div class="ambient-mixer">
    <div v-if="layerGroups.length" class="layer-groups">
      <section
        v-for="group in layerGroups"
        :key="group.category"
        class="layer-group"
      >
        <div class="text-subtitle2 text-grey-7 q-mb-sm">
          {{ group.category }}
        </div>
        <div class="layers-grid">
          <div
            v-for="layer in group.layers"
            :key="layer.id"
            class="layer-card"
            :class="{ active: store.activeLayers.has(layer.id) }"
            @click="toggleLayer(layer)"
          >
            <div class="layer-icon">
              <i
                v-if="isRpgIcon(layer.icon)"
                :class="['ra', markerIconClass(layer.icon)]"
                aria-hidden="true"
              ></i>
              <span v-else>{{ layer.icon }}</span>
            </div>
            <div class="layer-name">{{ layer.name }}</div>

            <QSelect
              v-if="variationsFor(layer).length > 1"
              :model-value="selectedVariationId(layer)"
              :options="variationOptions(layer)"
              dense
              outlined
              emit-value
              map-options
              class="layer-variation"
              @click.stop
              @update:model-value="
                (value: string | null) =>
                  value !== null && selectVariation(layer, value)
              "
            />

            <div
              v-if="store.activeLayers.has(layer.id)"
              class="layer-volume"
              @wheel.prevent="handleLayerVolumeWheel($event, layer.id)"
            >
              <QSlider
                :model-value="store.activeLayers.get(layer.id)?.volume ?? 0"
                :min="0"
                :max="1"
                :step="0.01"
                color="white"
                dense
                @click.stop
                @update:model-value="
                  (v: number | null) =>
                    v !== null && store.setLayerVolume(layer.id, v)
                "
              />
            </div>
            <div v-else class="layer-inactive">
              {{ $t('ambientSoundPage.off') }}
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="no-layers">
      {{ $t('ambientSoundPage.noLayers') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import { getLayerVariations } from '@/ambient-sound/utils/packData';
import { markerIconClass } from '@/maps/icons';
import type { LayerDef } from '@/ambient-sound/types';

interface LayerGroup {
  category: string;
  layers: LayerDef[];
}

const { t } = useI18n();
const store = useAmbientSoundStore();

const layerGroups = computed<LayerGroup[]>(() => {
  const groups = new Map<string, LayerDef[]>();
  for (const layer of store.currentPack?.layers ?? []) {
    const category =
      layer.category?.trim() || t('ambientSoundPage.ambientLayers');
    const layers = groups.get(category) ?? [];
    layers.push(layer);
    groups.set(category, layers);
  }
  return [...groups].map(([category, layers]) => ({ category, layers }));
});

function variationsFor(layer: LayerDef) {
  return getLayerVariations(layer);
}

function selectedVariationId(layer: LayerDef) {
  const variations = variationsFor(layer);
  const selected = store.layerVariationSelections.get(layer.id);
  return (
    variations.find((variation) => variation.id === selected)?.id ??
    variations[0]?.id ??
    ''
  );
}

function variationOptions(layer: LayerDef) {
  return variationsFor(layer).map((variation) => ({
    label: variation.name,
    value: variation.id,
  }));
}

function isRpgIcon(icon: string) {
  return icon.startsWith('ra-') || icon.includes(':ra-');
}

function toggleLayer(layer: LayerDef) {
  store.toggleLayer(layer.id, selectedVariationId(layer));
}

function selectVariation(layer: LayerDef, variationId: string) {
  store.setLayerVariation(layer.id, variationId);
}

function handleLayerVolumeWheel(event: WheelEvent, layerId: string) {
  const active = store.activeLayers.get(layerId);
  if (!active) return;
  const next = Math.max(0, Math.min(1, active.volume - event.deltaY * 0.001));
  store.setLayerVolume(layerId, Math.round(next * 100) / 100);
}
</script>

<style scoped>
.layer-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.layers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.layer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-card:hover {
  background: var(--color-background-mute);
}

.layer-card.active {
  background: var(--color-primary);
  color: white;
}

.layer-card.active .layer-inactive {
  color: rgba(255, 255, 255, 0.7);
}

.layer-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.layer-name {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.layer-variation {
  width: 100%;
  margin-top: 8px;
  min-width: 0;
}

.layer-volume {
  width: 100%;
  margin-top: 8px;
  color: var(--color-text-inverse);
}

.layer-card.active :deep(.q-slider__track),
.layer-card.active :deep(.q-slider__thumb) {
  color: var(--color-text-inverse);
}

.layer-inactive {
  font-size: 10px;
  color: var(--color-text-light);
  margin-top: 4px;
}

.no-layers {
  text-align: center;
  color: var(--color-text-light);
  padding: 1.5rem;
}
</style>
