<script setup lang="ts">
import FloatActionButton from './common/FloatActionButton.vue';

defineEmits<{(e: 'click', event: MouseEvent): void;
}>();
</script> 

<template>
  <FloatActionButton
    size="medium"
    variant="primary"
    @click="$emit('click', $event)"
  >
    🎲
  </FloatActionButton>
</template> 
