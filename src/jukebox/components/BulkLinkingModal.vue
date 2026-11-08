<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';

const props = defineProps<{
  modelValue: boolean;
  title: string;
  kind: MapEntityKind;
  links: MapEntityRef[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', links: MapEntityRef[]): void;
}>();

const { t } = useI18n();
const localLinks = ref<MapEntityRef[]>([]);
const modalId = computed(() => `jukebox-bulk-linking-${props.kind}`);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) localLinks.value = props.links.map((link) => ({ ...link }));
  },
);

watch(
  () => props.links,
  (links) => {
    if (props.modelValue) {
      localLinks.value = links.map((link) => ({ ...link }));
    }
  },
  { deep: true },
);

function submit() {
  emit(
    'submit',
    localLinks.value.map((link) => ({ ...link })),
  );
}
</script>

<template>
  <BaseModal
    :is-open="modelValue"
    :modal-id="modalId"
    :title="title"
    :show-submit="true"
    :show-cancel="true"
    :submit-label="t('common.save')"
    :cancel-label="t('common.cancel')"
    @submit="submit"
    @cancel="emit('update:modelValue', false)"
    @update:is-open="emit('update:modelValue', $event)"
  >
    <EntitiesLinking
      :kind="kind"
      :model-value="localLinks"
      @update:model-value="localLinks = $event"
    />
  </BaseModal>
</template>
