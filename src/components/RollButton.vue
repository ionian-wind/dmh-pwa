<script setup lang="ts">
import FloatActionButton from '@/components/common/FloatActionButton.vue';;

interface Props {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
  hideOnModal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  size: 'medium',
  variant: 'primary',
  disabled: false,
  hideOnModal: true
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const handleRollClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<template>
  <FloatActionButton
    :position="position"
    :size="size"
    :variant="variant"
    :disabled="disabled"
    :hide-on-modal="hideOnModal"
    @click="handleRollClick"
  >
    🎲
  </FloatActionButton>
</template> 
