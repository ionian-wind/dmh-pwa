<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import EntityLinkList from './EntityLinkList.vue';
import type { MapEntityKind, MapEntityRef } from '../types';
import { dedupeEntityRefs } from '../utils/entityRefs';
import { useMapEntityCatalog } from '../composables/useMapEntityCatalog';

const props = defineProps<{
  modelValue: MapEntityRef[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MapEntityRef[]): void;
}>();

const { t } = useI18n();
const { groups } = useMapEntityCatalog();

const kind = ref<MapEntityKind>('note');
const selectedId = ref('');

const kindOptions = computed(() =>
  groups.value.map((group) => ({
    label: t(group.labelKey),
    value: group.kind,
  })),
);

const entityOptions = computed(
  () => groups.value.find((group) => group.kind === kind.value)?.items ?? [],
);

const canAdd = computed(
  () =>
    !!selectedId.value &&
    !props.modelValue.some(
      (ref) => ref.kind === kind.value && ref.id === selectedId.value,
    ),
);

watch(kind, () => {
  selectedId.value = '';
});

function addLink() {
  if (!canAdd.value) return;
  emit(
    'update:modelValue',
    dedupeEntityRefs([
      ...props.modelValue,
      { kind: kind.value, id: selectedId.value },
    ]),
  );
  selectedId.value = '';
}

function removeLink(ref: MapEntityRef) {
  emit(
    'update:modelValue',
    props.modelValue.filter(
      (entry) => !(entry.kind === ref.kind && entry.id === ref.id),
    ),
  );
}
</script>

<template>
  <div class="column q-gutter-sm">
    <EntityLinkList :links="modelValue" removable @remove="removeLink" />

    <div class="row items-center q-gutter-sm">
      <QSelect
        v-model="kind"
        :options="kindOptions"
        :label="t('maps.entityKind')"
        dense
        outlined
        emit-value
        map-options
        class="col-3"
      />
      <QSelect
        v-model="selectedId"
        :options="entityOptions"
        :label="t('maps.entity')"
        dense
        outlined
        emit-value
        map-options
        class="col"
      />
      <QBtn
        flat
        color="primary"
        :label="t('common.add')"
        :disable="!canAdd"
        @click="addLink"
      />
    </div>
  </div>
</template>
