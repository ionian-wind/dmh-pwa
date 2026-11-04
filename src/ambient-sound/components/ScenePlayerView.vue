<template>
  <div class="scene-player-view">
    <div class="scene-view-header row items-center q-gutter-sm q-mb-md">
      <QBtn
        flat
        no-caps
        class="scene-back"
        :title="t('common.back')"
        :aria-label="t('common.back')"
        @click="emit('back')"
      >
        <IconArrowLeft :size="20" />
        <span class="q-ml-xs">{{ t('common.back') }}</span>
      </QBtn>
      <template v-if="entry">
        <QSeparator vertical />
        <div class="col">
          <div class="text-h6">{{ entry.scene.name }}</div>
          <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
        </div>
        <QBtnGroup flat class="scene-title-actions">
          <QBtn
            flat
            class="scene-play-button"
            :disable="!hasPlaybackContent"
            :title="t(isPlaybackRunning ? 'common.pause' : 'common.play')"
            :aria-label="t(isPlaybackRunning ? 'common.pause' : 'common.play')"
            @click="store.togglePlayPause()"
          >
            <IconPlayerPause v-if="isPlaybackRunning" />
            <IconPlayerPlay v-else />
          </QBtn>
          <VolumeControl
            :model-value="store.masterVolume / 100"
            :label="t('ambientSoundPage.masterVolume')"
            @update:model-value="(value) => store.setMasterVolume(value * 100)"
          />
        </QBtnGroup>
      </template>
    </div>

    <div v-if="entry" class="scene-player-content">
      <QToolbar class="q-pa-none q-mb-md">
        <div class="mood-label text-caption text-uppercase text-grey-7 q-mr-md">
          {{ t('ambientSoundPage.mood') }}
        </div>
        <div class="col row justify-end">
          <QBtnGroup rounded class="mood-buttons">
            <MoodButton
              :label="t('ambientSoundPage.off')"
              :active="musicOff"
              :disabled="!sceneControlsEnabled"
              @select="selectMusic(null)"
            />
            <MoodButton
              v-for="preset in entry.scene.musicPresets"
              :key="preset.id"
              :label="preset.name"
              :active="activePresetId === preset.id"
              :track-progress="preset.mode === 'temporary'"
              :disabled="!sceneControlsEnabled"
              @select="selectMusic(preset.id)"
            />
          </QBtnGroup>
        </div>
      </QToolbar>

      <AmbientControls class="q-mb-md" :disabled="!sceneControlsEnabled" />

      <EntityTabs v-model="activeTab" :tabs="tabs" class="q-mb-md" />

      <div v-if="activeTab === 'ambiences'">
        <VariationSelect
          v-if="variationOptions.length"
          :model-value="selectedVariationId"
          :options="variationOptions"
          class="q-mb-md"
          @update:model-value="onVariationChange"
        />
        <EntityGroup
          v-for="group in ambienceGroups"
          :key="group.category"
          :title="group.category"
        >
          <div class="column q-gutter-xs">
            <AmbienceItem
              v-for="row in group.rows"
              :key="row.ambience.id"
              :ambience="row.ambience"
              :variation-id="selectedVariationId"
              :active-variation-id="row.activeVariationId"
              :active-sample-index="row.activeSampleIndex"
              :disabled="!sceneControlsEnabled"
              @select-sample="
                (variationId, sampleIndex) =>
                  selectSample(row, variationId, sampleIndex)
              "
            />
          </div>
        </EntityGroup>
        <EmptyState
          v-if="ambienceGroups.length === 0"
          :icon="IconWaveSine"
          :title="t('ambientSoundPage.noAmbiencesInScene')"
        />
      </div>

      <div v-else>
        <EntityGroup
          v-for="group in oneShotGroups"
          :key="group.category"
          :title="group.category"
        >
          <div class="one-shot-grid">
            <OneShotControl
              v-for="oneShot in group.items"
              :key="oneShot.id"
              :pack-id="entry.pack.id"
              :one-shot="oneShot"
              :knob-size="68"
            />
          </div>
        </EntityGroup>
        <EmptyState
          v-if="oneShotGroups.length === 0"
          :icon="IconBell"
          :title="t('ambientSoundPage.noOneShotsInScene')"
        />
      </div>
    </div>
    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.noScenes')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconArrowLeft,
  IconBell,
  IconMusic,
  IconPlayerPause,
  IconPlayerPlay,
  IconWaveSine,
} from '@tabler/icons-vue';
import AmbienceItem from '@/ambient-sound/components/AmbienceItem.vue';
import AmbientControls from '@/ambient-sound/components/AmbientControls.vue';
import MoodButton from '@/ambient-sound/components/MoodButton.vue';
import OneShotControl from '@/ambient-sound/components/OneShotControl.vue';
import VariationSelect from '@/ambient-sound/components/VariationSelect.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EntityGroup from '@/components/common/EntityGroup.vue';
import EntityTabs from '@/components/common/EntityTabs.vue';
import VolumeControl from '@/components/common/VolumeControl.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import {
  findVariation,
  getGlobalVariations,
} from '@/ambient-sound/utils/packData';
import type { LayerDef, OneShotDef } from '@/ambient-sound/types';

const props = defineProps<{
  packId: string;
  sceneId: string;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const activeTab = ref('ambiences');

const entry = computed(
  () =>
    store.allScenes.find(
      ({ pack, scene }) =>
        pack.id === props.packId && scene.id === props.sceneId,
    ) ?? null,
);

const tabs = computed(() => [
  { id: 'ambiences', label: t('ambientSoundPage.ambiences') },
  { id: 'oneShots', label: t('ambientSoundPage.oneShotsTab') },
]);

const activePresetId = computed(() =>
  store.musicEnabled ? store.activeMusicPresetId : null,
);
const musicOff = computed(
  () => !store.musicEnabled || !store.activeMusicPresetId,
);

function sceneIsActive() {
  return store.activeSceneKey === `${props.packId}::${props.sceneId}`;
}

const sceneControlsEnabled = computed(
  () => store.isPlaying || (!store.activeScene && !store.hasActiveLayers),
);

const hasPlaybackContent = computed(
  () =>
    store.hasActiveLayers ||
    (store.musicEnabled && store.activeMusicPresetId !== null),
);

const isPlaybackRunning = computed(
  () => hasPlaybackContent.value && store.isPlaying,
);

async function selectMusic(presetId: string | null) {
  if (!sceneControlsEnabled.value) return;
  if (presetId === null) {
    store.setMusicPreset(null);
    return;
  }
  if (!sceneIsActive() || !store.isPlaying) {
    await store.playSceneMusic(props.packId, props.sceneId, presetId);
    return;
  }
  store.setMusicPreset(presetId);
}

const sceneAmbienceLayers = computed(() => {
  if (!entry.value) return [];
  return entry.value.scene.ambiences
    .map((selected) =>
      entry.value?.pack.ambiences.find(
        (item) => item.id === selected.ambienceId,
      ),
    )
    .filter((ambience): ambience is LayerDef => !!ambience);
});

const variationOptions = computed(() =>
  getGlobalVariations(sceneAmbienceLayers.value),
);

const selectedVariationId = ref('');

watch(
  variationOptions,
  (options) => {
    if (!options.some((option) => option.id === selectedVariationId.value)) {
      selectedVariationId.value = options[0]?.id ?? '';
    }
  },
  { immediate: true },
);

const ambienceGroups = computed(() => {
  if (!entry.value) return [];
  const variationId = selectedVariationId.value;
  if (!variationId) return [];

  const groups = new Map<
    string,
    Array<{
      ambience: LayerDef;
      activeVariationId: string | null;
      activeSampleIndex: number | null;
    }>
  >();

  for (const selected of entry.value.scene.ambiences) {
    const ambience = entry.value.pack.ambiences.find(
      (item) => item.id === selected.ambienceId,
    );
    if (!ambience) continue;
    const variation = findVariation(ambience, variationId);
    if (!variation?.samples.length) continue;
    const category =
      ambience.category?.trim() || t('ambientSoundPage.ambiences');
    const active = store.activeLayers.get(
      `${entry.value.pack.id}:${ambience.id}`,
    );
    const rows = groups.get(category) ?? [];
    rows.push({
      ambience,
      activeVariationId: active?.variationId ?? null,
      activeSampleIndex: active?.sampleIndex ?? null,
    });
    groups.set(category, rows);
  }

  return [...groups].map(([category, rows]) => ({ category, rows }));
});

const oneShotGroups = computed(() => {
  if (!entry.value) return [];
  const groups = new Map<string, OneShotDef[]>();
  for (const id of entry.value.scene.oneShotIds) {
    const oneShot = entry.value.pack.oneShots.find((item) => item.id === id);
    if (!oneShot) continue;
    const items = groups.get(oneShot.category) ?? [];
    items.push(oneShot);
    groups.set(oneShot.category, items);
  }
  return [...groups].map(([category, items]) => ({ category, items }));
});

async function selectSample(
  row: { ambience: LayerDef },
  variationId: string,
  sampleIndex: number,
) {
  await store.selectAmbienceSample(
    props.packId,
    row.ambience.id,
    variationId,
    sampleIndex,
  );
}

async function onVariationChange(variationId: string) {
  if (!variationId || variationId === selectedVariationId.value) return;
  selectedVariationId.value = variationId;
  await store.retuneAmbienceVariation(variationId, props.packId);
}

watch(
  () => [props.packId, props.sceneId],
  () => {
    activeTab.value = 'ambiences';
  },
  { immediate: true },
);
</script>

<style scoped>
.scene-player-view {
  width: 100%;
}

.scene-player-content {
  width: 100%;
}

.scene-back {
  flex: 0 0 auto;
}

.scene-title-actions {
  display: flex;
  align-items: center;
}

.scene-play-button:disabled {
  color: var(--color-text-light);
  opacity: 0.5;
}

.one-shot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}
</style>
