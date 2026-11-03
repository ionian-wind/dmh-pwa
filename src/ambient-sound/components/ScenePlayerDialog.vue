<template>
  <QDialog
    :model-value="isOpen"
    seamless
    class="scene-player-dialog"
    @update:model-value="(value: boolean) => !value && emit('close')"
  >
    <QCard v-if="entry" class="scene-player-card">
      <QCardSection class="row items-center q-gutter-sm">
        <AmbientIcon :icon="entry.scene.icon" :size="28" />
        <div class="col">
          <div class="text-h6">{{ entry.scene.name }}</div>
          <div class="text-caption text-grey-7">{{ entry.pack.name }}</div>
        </div>
        <QBtn flat round :aria-label="t('common.close')" @click="emit('close')">
          <IconX />
        </QBtn>
      </QCardSection>

      <QCardSection class="q-pt-none">
        <div class="row items-center q-gutter-md q-mb-md">
          <QBtn
            round
            color="primary"
            size="lg"
            :title="t(store.isPlaying ? 'common.pause' : 'common.play')"
            :aria-label="t(store.isPlaying ? 'common.pause' : 'common.play')"
            @click="togglePlayback"
          >
            <IconPlayerPause v-if="store.isPlaying" />
            <IconPlayerPlay v-else />
          </QBtn>
          <div class="col">
            <div class="text-subtitle1">
              {{ store.activeScene?.scene.name || entry.scene.name }}
            </div>
          </div>
          <div class="text-caption text-grey-7">
            {{ t('ambientSoundPage.intensity') }}: {{ store.intensity }}%
          </div>
        </div>

        <div class="text-caption text-uppercase text-grey-7 q-mb-xs">
          {{ t('ambientSoundPage.music') }}
        </div>
        <div class="music-bar q-mb-md">
          <QBtn
            :color="musicOff ? 'primary' : 'grey-7'"
            :outline="!musicOff"
            :label="t('ambientSoundPage.off')"
            size="sm"
            @click="store.setMusicPreset(null)"
          />
          <QBtn
            v-for="preset in entry.scene.musicPresets"
            :key="preset.id"
            :color="activePresetId === preset.id ? 'primary' : 'grey-7'"
            :outline="activePresetId !== preset.id"
            :label="preset.name"
            size="sm"
            @click="store.setMusicPreset(preset.id)"
          />
        </div>

        <TabGroup
          v-model="activeTab"
          :tabs="tabs"
          size="sm"
          align="justify"
          class="q-mb-md"
        />

        <div v-if="activeTab === 'ambiences'">
          <section
            v-for="group in ambienceGroups"
            :key="group.category"
            class="q-mb-md"
          >
            <div class="text-caption text-uppercase text-grey-7 q-mb-xs">
              {{ group.category }}
            </div>
            <div class="column q-gutter-xs">
              <QCard
                v-for="row in group.rows"
                :key="row.ambience.id"
                flat
                bordered
              >
                <QCardSection class="row items-center q-gutter-sm">
                  <AmbientIcon :icon="row.ambience.icon" :size="22" />
                  <div class="col">
                    <div class="text-subtitle2">{{ row.ambience.name }}</div>
                    <div class="text-caption text-grey-7">
                      {{ row.ambience.category || group.category }}
                    </div>
                  </div>
                  <QBtnGroup flat>
                    <QBtn
                      v-for="variation in row.variations"
                      :key="variation.id"
                      :class="{
                        'variant-active':
                          row.activeVariationId === variation.id,
                      }"
                      :outline="row.activeVariationId !== variation.id"
                      :label="variation.name"
                      size="sm"
                      @click="toggleVariant(row, variation.id)"
                    />
                  </QBtnGroup>
                </QCardSection>
              </QCard>
            </div>
          </section>
          <EmptyState
            v-if="ambienceGroups.length === 0"
            :icon="IconWaveSine"
            :title="t('ambientSoundPage.noAmbiencesInScene')"
          />
        </div>

        <div v-else>
          <section
            v-for="group in oneShotGroups"
            :key="group.category"
            class="q-mb-md"
          >
            <div class="text-caption text-uppercase text-grey-7 q-mb-xs">
              {{ group.category }}
            </div>
            <div class="one-shot-grid">
              <QCard
                v-for="oneShot in group.items"
                :key="oneShot.id"
                flat
                bordered
                class="one-shot-card"
                :class="{
                  'is-playing': store.isOneShotPlaying(
                    entry.pack.id,
                    oneShot.id,
                  ),
                }"
                role="button"
                tabindex="0"
                @click="store.playOneShot(entry.pack.id, oneShot.id)"
                @keydown.enter.prevent="
                  store.playOneShot(entry.pack.id, oneShot.id)
                "
                @keydown.space.prevent="
                  store.playOneShot(entry.pack.id, oneShot.id)
                "
              >
                <QCardSection
                  class="column items-center text-center q-gutter-xs"
                >
                  <AmbientIcon :icon="oneShot.icon" :size="26" />
                  <div class="text-caption">{{ oneShot.name }}</div>
                </QCardSection>
              </QCard>
            </div>
          </section>
          <EmptyState
            v-if="oneShotGroups.length === 0"
            :icon="IconBell"
            :title="t('ambientSoundPage.noOneShotsInScene')"
          />
        </div>
      </QCardSection>
    </QCard>
  </QDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconBell,
  IconPlayerPause,
  IconPlayerPlay,
  IconWaveSine,
  IconX,
} from '@tabler/icons-vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import { getLayerVariations } from '@/ambient-sound/utils/packData';
import type {
  LayerDef,
  OneShotDef,
  SceneLinkEntityType,
} from '@/ambient-sound/types';

const props = defineProps<{
  isOpen: boolean;
  packId: string;
  sceneId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
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

async function togglePlayback() {
  if (!sceneIsActive()) {
    await store.playScene(props.packId, props.sceneId);
    return;
  }
  store.togglePlayPause();
}

const ambienceGroups = computed(() => {
  if (!entry.value) return [];
  const groups = new Map<
    string,
    Array<{
      ambience: LayerDef;
      variations: ReturnType<typeof getLayerVariations>;
      activeVariationId: string | null;
    }>
  >();

  for (const selected of entry.value.scene.ambiences) {
    const ambience = entry.value.pack.ambiences.find(
      (item) => item.id === selected.ambienceId,
    );
    if (!ambience) continue;
    const category =
      ambience.category?.trim() || t('ambientSoundPage.ambiences');
    const active = store.activeLayers.get(
      `${entry.value.pack.id}:${ambience.id}`,
    );
    const rows = groups.get(category) ?? [];
    rows.push({
      ambience,
      variations: getLayerVariations(ambience),
      activeVariationId: active?.variationId ?? null,
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

async function toggleVariant(
  row: { ambience: LayerDef; activeVariationId: string | null },
  variationId: string,
) {
  const key = `${props.packId}:${row.ambience.id}`;
  const active = store.activeLayers.get(key);
  if (active?.variationId === variationId) {
    await store.toggleAmbience(props.packId, row.ambience.id);
    return;
  }
  if (active) {
    await store.setAmbienceVariation(
      props.packId,
      row.ambience.id,
      variationId,
    );
    return;
  }
  await store.toggleAmbience(props.packId, row.ambience.id, variationId);
}

watch(
  () => [props.isOpen, props.packId, props.sceneId],
  async () => {
    if (!props.isOpen) return;
    activeTab.value = 'ambiences';
    if (!sceneIsActive()) {
      await store.playScene(props.packId, props.sceneId);
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.scene-player-dialog :deep(.q-dialog__inner) {
  padding: 24px;
}

.scene-player-card {
  width: min(760px, 100%);
  max-height: min(88vh, 900px);
  overflow-y: auto;
}

.music-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variant-active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.one-shot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

.one-shot-card {
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.one-shot-card.is-playing {
  border-color: var(--color-primary);
  background: var(--color-background-soft);
}

@media (max-width: 600px) {
  .scene-player-dialog :deep(.q-dialog__inner) {
    padding: 0;
  }

  .scene-player-card {
    width: 100%;
    max-height: 100vh;
  }
}
</style>
