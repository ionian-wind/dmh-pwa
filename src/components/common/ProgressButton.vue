<template>
  <QBtn class="progress-button" :aria-busy="isBusy ? 'true' : undefined">
    <ProgressIndicator
      :state="state"
      :percent="percent"
      @update:state="emit('update:state', $event)"
      @finish="emit('finish')"
    >
      <slot />
    </ProgressIndicator>
  </QBtn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ProgressIndicator, {
  type ProgressIndicatorState,
} from '@/components/common/ProgressIndicator.vue';

const props = withDefaults(
  defineProps<{
    state?: ProgressIndicatorState;
    /** Progress from 0 to 100. */
    percent?: number;
  }>(),
  {
    state: 'none',
    percent: 0,
  },
);

const emit = defineEmits<{
  (e: 'update:state', value: ProgressIndicatorState): void;
  (e: 'finish'): void;
}>();

const isBusy = computed(
  () => props.state === 'loading' || props.state === 'playing',
);
</script>
