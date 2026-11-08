<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-vue';

const props = withDefaults(
  defineProps<{
    title: string;
    active?: boolean;
    playing?: boolean;
    clickable?: boolean;
    playable?: boolean;
    removable?: boolean;
    actionsVisible?: boolean;
    removeLabel?: string;
  }>(),
  {
    active: false,
    playing: false,
    clickable: true,
    playable: false,
    removable: false,
    actionsVisible: true,
    removeLabel: '',
  },
);

const emit = defineEmits<{
  (e: 'activate'): void;
  (e: 'toggle'): void;
  (e: 'remove'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <QItem
    v-ripple
    :clickable="props.clickable"
    class="sidebar-action-item"
    :class="{
      'sidebar-action-item--selected': props.active,
      'sidebar-action-item--playing': props.playing,
    }"
    @click="emit('activate')"
  >
    <slot name="leading" />
    <QItemSection>{{ props.title }}</QItemSection>
    <QItemSection
      side
      class="sidebar-action-item-actions"
      :class="{
        'sidebar-action-item-actions--hidden': !props.actionsVisible,
      }"
    >
      <QBtn
        v-if="props.playable"
        class="sidebar-action-item-toggle"
        flat
        dense
        size="sm"
        :title="props.playing ? t('common.pause') : t('common.play')"
        :aria-label="props.playing ? t('common.pause') : t('common.play')"
        @click.stop="emit('toggle')"
      >
        <IconPlayerPause v-if="props.playing" :size="18" />
        <IconPlayerPlay v-else :size="18" />
      </QBtn>
      <slot name="actions" />
      <QBtn
        v-if="props.removable"
        class="sidebar-action-item-remove"
        flat
        dense
        size="sm"
        color="negative"
        :title="props.removeLabel || t('common.remove')"
        :aria-label="props.removeLabel || t('common.remove')"
        @click.stop="emit('remove')"
      >
        <IconX :size="18" />
      </QBtn>
    </QItemSection>
  </QItem>
</template>

<style scoped>
.sidebar-action-item--selected {
  background: var(--color-selected-surface) !important;
  color: var(--color-text) !important;
  font-weight: 500;
}

.sidebar-action-item--playing {
  box-shadow: inset 4px 0 0 var(--color-accent);
}

.sidebar-action-item-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: center;
  gap: 0.15rem;
}

.sidebar-action-item-actions--hidden {
  display: none;
}
</style>
