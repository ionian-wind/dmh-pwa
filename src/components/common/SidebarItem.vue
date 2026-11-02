<script setup lang="ts">
defineProps<{
  color?: string | null;
  title: string;
}>();
</script>

<template>
  <QItem
    clickable
    class="sidebar-item q-mx-sm q-mb-sm q-pa-sm bg-white rounded-borders"
    :style="color ? { borderLeft: `4px solid ${color}` } : undefined"
  >
    <QItemSection v-if="$slots.left" side class="sidebar-item-left">
      <slot name="left" />
    </QItemSection>

    <QItemSection>
      <div class="text-weight-bold ellipsis">{{ title }}</div>
      <slot />
    </QItemSection>

    <QItemSection
      v-if="$slots.actions"
      side
      class="sidebar-item-actions row items-center"
    >
      <slot name="actions" />
    </QItemSection>
  </QItem>
</template>

<style scoped>
.sidebar-item-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sidebar-item:hover .sidebar-item-actions,
.sidebar-item:focus-within .sidebar-item-actions {
  opacity: 1;
}

.sidebar-item-left {
  flex: none;
}
</style>
