<template>
  <div class="ambient-mixer">
    <div class="section-header">
      <span class="section-label">{{
        $t('ambientSoundPage.ambientLayers')
      }}</span>
      <QBtn
        flat
        dense
        :icon="store.isPlaying ? 'pause' : 'play_arrow'"
        @click="store.togglePlayPause()"
      />
    </div>

    <div v-if="store.currentPack?.layers.length" class="layers-grid">
      <div
        v-for="layer in store.currentPack.layers"
        :key="layer.id"
        class="layer-card"
        :class="{ active: store.activeLayers.has(layer.id) }"
        @click="store.toggleLayer(layer.id)"
      >
        <div class="layer-icon">{{ layer.icon }}</div>
        <div class="layer-name">{{ layer.name }}</div>
        <div v-if="store.activeLayers.has(layer.id)" class="layer-volume">
          <QSlider
            :model-value="store.activeLayers.get(layer.id)?.volume ?? 0"
            :min="0"
            :max="1"
            :step="0.01"
            color="primary"
            dense
            @click.stop
            @update:model-value="
              (v: number | null) =>
                v !== null && store.setLayerVolume(layer.id, v)
            "
          />
        </div>
        <div v-else class="layer-inactive">Off</div>
      </div>
    </div>

    <div v-else class="no-layers">
      {{ $t('ambientSoundPage.noLayers') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const store = useAmbientSoundStore();
</script>

<style scoped>
.ambient-mixer {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.layers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.layer-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-card:hover {
  background: #e8e8e8;
}

.layer-card.active {
  background: var(--q-primary);
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

.layer-volume {
  width: 100%;
  margin-top: 8px;
}

.layer-inactive {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}

.no-layers {
  text-align: center;
  color: #999;
  padding: 24px;
}
</style>
