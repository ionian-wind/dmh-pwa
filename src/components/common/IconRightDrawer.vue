<script setup lang="ts">
import { IconLayoutSidebarRightFilled } from '@tabler/icons-vue';
import { useLayout } from '@/composables/useLayout';

const { rightDrawerOpen } = useLayout();
</script>

<template>
  <IconLayoutSidebarRightFilled v-if="rightDrawerOpen" />
  <QIcon name="tabler-layout-sidebar-right" v-else />
</template>
