<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MapEntityRef } from '../types';
import {
  MAP_ENTITY_KIND_OPTIONS,
  getEntityKindOption,
} from '../utils/entityRefs';
import { useMapEntityCatalog } from '../composables/useMapEntityCatalog';

const props = withDefaults(
  defineProps<{
    links: MapEntityRef[];
    removable?: boolean;
  }>(),
  { removable: false },
);

const emit = defineEmits<{
  (e: 'remove', ref: MapEntityRef): void;
}>();

const { t } = useI18n();
const { getLabel } = useMapEntityCatalog();

const resolved = computed(() =>
  props.links.map((ref) => ({
    ref,
    label: getLabel(ref),
    kindLabel: t(
      getEntityKindOption(ref.kind)?.labelKey ??
        MAP_ENTITY_KIND_OPTIONS[0].labelKey,
    ),
  })),
);
</script>

<template>
  <div class="entity-link-list">
    <span
      v-for="link in resolved"
      :key="`${link.ref.kind}:${link.ref.id}`"
      class="entity-link-chip"
      :title="`${link.kindLabel}: ${link.label}`"
    >
      <span class="entity-link-kind">{{ link.kindLabel }}</span>
      <span class="entity-link-label">{{ link.label }}</span>
      <button
        v-if="removable"
        type="button"
        class="entity-link-remove"
        :aria-label="t('common.remove')"
        @click.stop="emit('remove', link.ref)"
      >
        ×
      </button>
    </span>
  </div>
</template>

<style scoped>
.entity-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.entity-link-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 0.8rem;
}

.entity-link-kind {
  color: var(--color-text-light);
}

.entity-link-remove {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-danger);
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
</style>
