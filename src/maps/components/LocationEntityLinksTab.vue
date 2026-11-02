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
  <div class="column q-gutter-md">
    <div class="row items-center q-gutter-sm">
      <QSelect
        v-model="selectedId"
        :options="selectOptions"
        :label="t('maps.entity')"
        outlined
        emit-value
        map-options
        class="col"
      />
      <QBtn
        color="primary"
        :label="t('common.add')"
        :disable="!selectedId"
        @click="add"
      />
    </div>

    <div v-if="links.length === 0" class="text-caption text-grey-7">
      {{ t('maps.noLinkedEntities') }}
    </div>

    <QList v-else>
      <QItem
        v-for="link in links"
        :key="link.id"
        class="q-mb-xs bg-white rounded-borders"
      >
        <QItemSection>{{ labelFor(link.id) }}</QItemSection>
        <QItemSection side>
          <QBtn
            flat
            color="negative"
            size="sm"
            :label="t('common.remove')"
            @click="emit('remove', link)"
          />
        </QItemSection>
      </QItem>
    </QList>
  </div>
</template>
