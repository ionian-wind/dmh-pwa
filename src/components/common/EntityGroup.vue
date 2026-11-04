<template>
  <section class="entity-group">
    <div class="entity-group-header row items-center q-gutter-sm q-mb-sm">
      <span class="text-caption text-uppercase text-grey-7">{{ title }}</span>
      <QSeparator class="col" />
    </div>
    <div class="q-pa-sm">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.entity-group + .entity-group {
  margin-top: 1.25rem;
}
</style>
