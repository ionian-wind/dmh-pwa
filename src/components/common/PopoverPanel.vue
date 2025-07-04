<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  isOpen: boolean;
  triggerEl?: any;
  trigger?: 'click' | 'hover' | 'focus';
  placement?: string;
  offset?: number;
  maxWidth?: string;
  minWidth?: string;
  disableInternalTrigger?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  triggerEl: undefined,
  trigger: 'click',
  placement: 'bottom',
  offset: 8,
  maxWidth: undefined,
  minWidth: undefined,
  disableInternalTrigger: false,
});

const emit = defineEmits(['close', 'open']);

const isVisible = ref(props.isOpen);
const triggerRef = ref<HTMLElement | null>(null);

watch(
  () => props.isOpen,
  (val) => {
    isVisible.value = val;
  },
);
watch(isVisible, (val) => {
  if (val) emit('open');
  else emit('close');
});

function open() {
  isVisible.value = true;
}
function close() {
  isVisible.value = false;
}
function toggle() {
  isVisible.value = !isVisible.value;
}

defineExpose({ open, close, toggle });
</script>

<template>
  <div>
    <template v-if="!disableInternalTrigger">
      <span ref="triggerRef">
        <slot name="trigger" />
      </span>
    </template>
    <QMenu
      v-model="isVisible"
      :anchor="triggerEl || triggerRef"
      :max-width="maxWidth"
      :min-width="minWidth"
      :offset="offset"
      :cover="false"
      :target="triggerEl || triggerRef"
      :anchor-origin="placement"
      :self-origin="placement"
      @show="emit('open')"
      @hide="emit('close')"
    >
      <slot />
    </QMenu>
  </div>
</template>
