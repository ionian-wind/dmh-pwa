<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MapEntityKind, MapEntityRef } from '../types';

const props = defineProps<{
  kind: MapEntityKind;
  links: MapEntityRef[];
  options: Array<{ id: string; label: string }>;
}>();

const emit = defineEmits<{
  (e: 'add', ref: MapEntityRef): void;
  (e: 'remove', ref: MapEntityRef): void;
}>();

const { t } = useI18n();
const selectedId = ref<string | null>(null);

const selectOptions = computed(() =>
  props.options
    .filter((option) => !props.links.some((link) => link.id === option.id))
    .map((option) => ({ label: option.label, value: option.id })),
);

function labelFor(id: string) {
  return props.options.find((option) => option.id === id)?.label || id;
}

function add() {
  if (!selectedId.value) return;
  emit('add', { kind: props.kind, id: selectedId.value });
  selectedId.value = null;
}
</script>

<template>
  <div class="location-links-tab">
    <div class="location-link-add">
      <QSelect
        v-model="selectedId"
        :options="selectOptions"
        :label="t('maps.entity')"
        outlined
        emit-value
        map-options
      />
      <QBtn
        color="primary"
        :label="t('common.add')"
        :disable="!selectedId"
        @click="add"
      />
    </div>

    <p v-if="links.length === 0" class="location-links-empty">
      {{ t('maps.noLinkedEntities') }}
    </p>

    <div v-else class="location-link-list">
      <div v-for="link in links" :key="link.id" class="location-link-item">
        <span>{{ labelFor(link.id) }}</span>
        <QBtn
          flat
          color="negative"
          size="sm"
          :label="t('common.remove')"
          @click="emit('remove', link)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.location-links-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.location-link-add {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.location-link-add > :first-child {
  flex: 1;
}

.location-links-empty {
  color: var(--color-text-light);
}

.location-link-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.location-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
}
</style>
