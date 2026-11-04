<template>
  <QBtn
    class="progress-button"
    :loading="isLoading"
    :aria-busy="isBusy ? 'true' : undefined"
  >
    <ProgressIndicator
      :state="indicatorState"
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

type ProgressButtonState = 'none' | 'loading' | 'playing';

const props = withDefaults(
  defineProps<{
    state?: ProgressButtonState;
    /** Progress from 0 to 100. */
    percent?: number;
  }>(),
  {
    state: 'none',
    percent: 0,
  },
);

const emit = defineEmits<{
  (e: 'update:state', value: ProgressButtonState): void;
  (e: 'finish'): void;
}>();

const isLoading = computed(() => props.state === 'loading');
const isBusy = computed(
  () => props.state === 'loading' || props.state === 'playing',
);
const indicatorState = computed<ProgressIndicatorState>(() =>
  props.state === 'loading' ? 'none' : props.state,
);
</script>
