<template>
  <section class="entity-group">
    <div class="entity-group-header row items-center q-gutter-sm q-mb-sm">
      <a
        v-if="to"
        :href="to"
        class="entity-group-title-link text-caption text-uppercase text-grey-7"
        @click.prevent="onTitleClick?.()"
      >
        {{ title }}
      </a>
      <span v-else class="text-caption text-uppercase text-grey-7">
        {{ title }}
      </span>
      <QSeparator class="col" />
      <slot name="actions" />
    </div>
    <div class="q-pa-sm">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  to?: string;
  onTitleClick?: () => void;
}>();
</script>

<style scoped>
.entity-group-header :deep(.q-separator) {
  background: var(--color-separator);
}

.entity-group-title-link {
  color: inherit;
  text-decoration: none;
}

.entity-group-title-link:hover {
  color: var(--color-accent);
}

.entity-group + .entity-group {
  margin-top: 1.25rem;
}
</style>
