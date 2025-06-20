<template>
  <FloatActionButton
    position="bottom-right"
    size="medium"
    variant="secondary"
    :static="true"
    @click="goToJukebox"
    title="Jukebox"
  >
    <i class="si-music-note" />
  </FloatActionButton>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import FloatActionButton from './common/FloatActionButton.vue';

const router = useRouter();

const goToJukebox = () => {
  router.push({ name: 'Jukebox' });
};
</script> 