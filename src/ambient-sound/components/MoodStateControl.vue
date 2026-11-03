<template>
  <div class="mood-state-control">
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-subtitle1 text-weight-medium">
        {{ $t('ambientSoundPage.moodState') }}
      </div>
      <div class="row items-center q-gutter-xs">
        <IconMusic v-if="store.musicEnabled" :size="18" />
        <IconMusicOff v-else :size="18" />
        <span class="text-caption">{{ $t('ambientSoundPage.music') }}</span>
        <QToggle
          :model-value="store.musicEnabled"
          :title="
            t(
              store.musicEnabled
                ? 'ambientSoundPage.musicOff'
                : 'ambientSoundPage.musicOn',
            )
          "
          @update:model-value="store.setMusicEnabled"
        />
      </div>
    </div>
    <div class="mood-buttons">
      <QBtn
        v-for="mood in moodStates"
        :key="mood.state"
        :color="store.currentMoodState === mood.state ? 'primary' : 'grey-7'"
        :outline="store.currentMoodState !== mood.state"
        size="md"
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
import { useI18n } from 'vue-i18n';
import {
  IconCampfire,
  IconMusic,
  IconMusicOff,
  IconSearch,
  IconSwords,
  IconTrophy,
} from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { MoodState } from '@/ambient-sound/types';

const { t } = useI18n();
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
    {
      state: 'explore',
      label: t('ambientSoundPage.moods.explore'),
      icon: IconSearch,
    },
    {
      state: 'combat',
      label: t('ambientSoundPage.moods.combat'),
      icon: IconSwords,
    },
    {
      state: 'victory',
      label: t('ambientSoundPage.moods.victory'),
      icon: IconTrophy,
    },
    {
      state: 'rest',
      label: t('ambientSoundPage.moods.rest'),
      icon: IconCampfire,
    },
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
.mood-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-buttons > * {
  flex: 1;
  min-width: 90px;
}
</style>
