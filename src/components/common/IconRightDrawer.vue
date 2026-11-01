<script setup lang="ts">
import { inject, type Ref } from 'vue';
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from '@tabler/icons-vue';

const rightDrawerOpen = inject<Ref<boolean> | null>('rightDrawerOpen', null);
</script>

<template>
  <IconLayoutSidebarRightFilled v-if="rightDrawerOpen" />
  <IconLayoutSidebarRight v-else />
</template>
