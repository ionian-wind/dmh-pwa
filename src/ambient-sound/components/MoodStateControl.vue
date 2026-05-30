<template>
  <div class="mood-state-control">
    <div class="section-label">{{ $t('ambientSoundPage.moodState') }}</div>
    <div class="mood-buttons">
      <QBtn
        v-for="mood in moodStates"
        :key="mood.state"
        :class="{ active: store.currentMoodState === mood.state }"
        :outline="store.currentMoodState !== mood.state"
        size="lg"
        @click="store.setMoodState(mood.state)"
      >
        <component :is="mood.icon" size="20" style="margin-right: 8px" />
        {{ mood.label }}
      </QBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
  IconSearch,
  IconSwords,
  IconTrophy,
  IconCampfire,
} from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { MoodState } from '@/ambient-sound/types';

const store = useAmbientSoundStore();

interface MoodOption {
  state: MoodState;
  label: string;
  icon: Component;
}

const moodStates = computed<MoodOption[]>(() => {
  if (store.currentPack?.moodStates) {
    return store.currentPack.moodStates.map((m) => ({
      state: m.state,
      label: m.name,
      icon: m.icon ? getIconFromEmoji(m.icon) : getDefaultIcon(m.state),
    }));
  }
  return [
    { state: 'explore', label: 'Explore', icon: IconSearch },
    { state: 'combat', label: 'Combat', icon: IconSwords },
    { state: 'victory', label: 'Victory', icon: IconTrophy },
    { state: 'rest', label: 'Rest', icon: IconCampfire },
  ];
});

function getDefaultIcon(state: MoodState): Component {
  const icons: Record<MoodState, Component> = {
    explore: IconSearch,
    combat: IconSwords,
    victory: IconTrophy,
    rest: IconCampfire,
  };
  return icons[state];
}

function getIconFromEmoji(iconStr: string): Component {
  const emojiToIcon: Record<string, Component> = {
    '🔍': IconSearch,
    '⚔️': IconSwords,
    '🏆': IconTrophy,
    '🔥': IconCampfire,
  };
  return emojiToIcon[iconStr] || IconSearch;
}
</script>

<style scoped>
.mood-state-control {
  margin-bottom: 16px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.mood-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-buttons .QBtn {
  flex: 1;
  min-width: 80px;
}

.mood-buttons .QBtn.active {
  background: var(--q-primary);
  color: white;
}
</style>
