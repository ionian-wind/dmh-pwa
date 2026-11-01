<script setup lang="ts">
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from '@tabler/icons-vue';
import { useLayout } from '@/composables/useLayout';

const { rightDrawerOpen } = useLayout();
</script>

<template>
  <IconLayoutSidebarRightFilled v-if="rightDrawerOpen" />
  <IconLayoutSidebarRight v-else />
</template>
