<script setup lang="ts">
import TimersPanel from '@/timers/TimersPanel.vue';
import { timersOpen } from './state';
</script>

<template>
  <TimersPanel v-model="timersOpen" />
</template>
