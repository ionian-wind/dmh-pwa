<template>
  <FloatActionButton
    position="bottom-right"
    size="medium"
    variant="primary"
    :static="true"
    @click="$emit('click', $event)"
  >
    🎲
  </FloatActionButton>
</template>

<script setup lang="ts">
import FloatActionButton from './common/FloatActionButton.vue';

defineEmits<{(e: 'click', event: MouseEvent): void;
}>();
</script> 
